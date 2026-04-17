import { Component, type ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { getTranslation } from "@/lib/i18n";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View className="flex-1 items-center justify-center bg-app-bg p-6 dark:bg-dark-bg">
          <Text className="font-inter-semibold text-lg text-stone-900 dark:text-stone-100">
            {getTranslation("errorBoundary.title")}
          </Text>
          <Text className="mt-2 text-center text-sm text-stone-600 dark:text-stone-400">
            {__DEV__ ? this.state.error.message : "Please restart the app."}
          </Text>
          <Pressable
            onPress={() => this.setState({ hasError: false, error: null })}
            accessibilityRole="button"
            accessibilityLabel={getTranslation("errorBoundary.retry")}
            className="mt-6 rounded-xl bg-accent-dark px-6 py-3 dark:bg-accent"
          >
            <Text className="font-inter-semibold text-white dark:text-stone-900">
              {getTranslation("errorBoundary.retry")}
            </Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
