'use client';
import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{children:ReactNode; fallback?:ReactNode}, {error:boolean}> {
  state = {error:false};
  static getDerivedStateFromError() { return {error:true}; }
  render() { return this.state.error ? this.props.fallback ?? <div role="alert" className="empty"><h3>This panel could not load.</h3><p>The rest of the workspace is still available.</p><button onClick={() => this.setState({error:false})}>Retry panel</button></div> : this.props.children; }
}
