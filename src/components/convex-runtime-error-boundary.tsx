"use client";

import { Component, type ReactNode } from "react";
import { AppErrorScreen } from "@/components/app-error-screen";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ConvexRuntimeErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <AppErrorScreen />;
    }
    return this.props.children;
  }
}
