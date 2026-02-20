import { Component, type ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { getTranslation } from "../lib/i18n";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View className="flex-1 items-center justify-center bg-stone-50 p-6">
          <Text className="text-lg font-medium text-slate-900">{getTranslation("errorBoundary.title")}</Text>
          <Text className="mt-2 text-center text-sm text-slate-500">
            {this.state.error.message}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            accessibilityRole="button"
            accessibilityLabel={getTranslation("errorBoundary.retry")}
            className="mt-6 rounded-xl bg-teal-700 px-6 py-3"
          >
            <Text className="font-medium text-white">{getTranslation("errorBoundary.retry")}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
