/**
 * Tests for useDbQuery + useDbMutation. Uses @testing-library/react-native
 * to drive the React lifecycle. expo-router's useFocusEffect is mocked to
 * a no-op so the tests don't need a Navigator stack.
 */

import { Text } from "react-native";
import { act, render, waitFor } from "@testing-library/react-native";
import { _resetQueryCache, invalidateQuery, useDbQuery } from "./useDbQuery";
import { useDbMutation } from "./useDbMutation";

jest.mock("expo-router", () => ({
  useFocusEffect: () => {
    /* no-op for tests */
  },
}));

beforeEach(() => {
  _resetQueryCache();
});

function Probe<T>({
  name,
  hookKey,
  fetcher,
  enabled,
}: {
  name: string;
  hookKey: readonly unknown[];
  fetcher: () => Promise<T>;
  enabled?: boolean;
}) {
  const q = useDbQuery<T>(hookKey, fetcher, { enabled });
  return (
    <Text testID={name}>
      {q.status}|{q.data === undefined ? "none" : String(q.data)}
    </Text>
  );
}

describe("useDbQuery", () => {
  it("fetches data on mount and exposes it via status=success", async () => {
    const fetcher = jest.fn().mockResolvedValue(42);
    const { getByTestId } = render(<Probe name="p" hookKey={["count"]} fetcher={fetcher} />);
    await waitFor(() => {
      expect(getByTestId("p").props.children.join("")).toBe("success|42");
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent subscribers to the same key", async () => {
    const fetcher = jest.fn().mockResolvedValue("x");
    const { getByTestId } = render(
      <>
        <Probe name="a" hookKey={["dup"]} fetcher={fetcher} />
        <Probe name="b" hookKey={["dup"]} fetcher={fetcher} />
      </>
    );
    await waitFor(() => {
      expect(getByTestId("a").props.children.join("")).toBe("success|x");
      expect(getByTestId("b").props.children.join("")).toBe("success|x");
    });
    // Only one fetch — second subscriber shares the in-flight promise.
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("captures errors as status=error without throwing", async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error("boom"));
    const { getByTestId } = render(<Probe name="e" hookKey={["err"]} fetcher={fetcher} />);
    await waitFor(() => {
      expect(getByTestId("e").props.children.join("")).toBe("error|none");
    });
  });

  it("does not fetch when enabled=false", async () => {
    const fetcher = jest.fn().mockResolvedValue("nope");
    const { getByTestId } = render(
      <Probe name="d" hookKey={["disabled"]} fetcher={fetcher} enabled={false} />
    );
    // Wait one tick to confirm no fetch happened.
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(getByTestId("d").props.children.join("")).toBe("idle|none");
  });

  it("invalidateQuery triggers a refetch and updates subscribers", async () => {
    let counter = 0;
    const fetcher = jest.fn(async () => ++counter);
    const { getByTestId } = render(<Probe name="r" hookKey={["live"]} fetcher={fetcher} />);
    await waitFor(() => expect(getByTestId("r").props.children.join("")).toBe("success|1"));

    await act(async () => {
      invalidateQuery(["live"]);
      // Flush microtasks for the refetch promise to resolve.
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(getByTestId("r").props.children.join("")).toBe("success|2"));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("useDbMutation", () => {
  function MutationProbe({
    onMutateFn,
    onSuccess,
    onError,
    autoRun,
    invalidates,
  }: {
    onMutateFn: (n: number) => Promise<string>;
    onSuccess?: (r: string, v: number) => void;
    onError?: (e: unknown, v: number) => void;
    autoRun?: number;
    invalidates?: readonly (readonly unknown[])[];
  }) {
    const m = useDbMutation(onMutateFn, {
      ...(onSuccess !== undefined && { onSuccess }),
      ...(onError !== undefined && { onError }),
      ...(invalidates !== undefined && { invalidates }),
    });
    if (autoRun !== undefined && m.status === "idle") {
      void m.mutate(autoRun);
    }
    return <Text testID="status">{m.status}</Text>;
  }

  it("runs fn, transitions idle → loading → success and calls onSuccess", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const onSuccess = jest.fn();
    const { getByTestId } = render(
      <MutationProbe onMutateFn={fn} onSuccess={onSuccess} autoRun={7} />
    );
    await waitFor(() => expect(getByTestId("status").props.children).toBe("success"));
    expect(fn).toHaveBeenCalledWith(7);
    expect(onSuccess).toHaveBeenCalledWith("ok", 7, undefined);
  });

  it("captures rejections as status=error and calls onError", async () => {
    const err = new Error("nope");
    const fn = jest.fn().mockRejectedValue(err);
    const onError = jest.fn();
    const { getByTestId } = render(<MutationProbe onMutateFn={fn} onError={onError} autoRun={1} />);
    await waitFor(() => expect(getByTestId("status").props.children).toBe("error"));
    expect(onError).toHaveBeenCalledWith(err, 1, undefined);
  });

  it("invalidates listed query keys after success", async () => {
    let counter = 0;
    const fetcher = jest.fn(async () => ++counter);
    const fn = jest.fn().mockResolvedValue("written");

    function Combo() {
      const q = useDbQuery(["thing"], fetcher);
      const m = useDbMutation(fn, { invalidates: [["thing"]] });
      if (m.status === "idle" && q.status === "success") {
        void m.mutate(0);
      }
      return (
        <Text testID="combo">
          {q.status}|{String(q.data)}|{m.status}
        </Text>
      );
    }

    const { getByTestId } = render(<Combo />);
    await waitFor(() =>
      expect(getByTestId("combo").props.children.join("")).toMatch(/success\|2\|success/)
    );
    // Two fetches: initial + post-mutation invalidation.
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
