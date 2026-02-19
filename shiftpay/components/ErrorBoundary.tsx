import { Component, type ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";

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
        <View className="flex-1 items-center justify-center bg-gray-50 p-6">
          <Text className="text-lg font-medium text-gray-900">Noe gikk galt</Text>
          <Text className="mt-2 text-center text-sm text-gray-600">
            {this.state.error.message}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-3"
          >
            <Text className="font-medium text-white">Prøv igjen</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
