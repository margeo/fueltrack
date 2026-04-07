import { Component } from "react";
import i18n from "../i18n";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? ` - ${this.props.name}` : ""}]`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const t = i18n.t.bind(i18n);

      return (
        <div className="error-boundary-fallback" style={{
          padding: "2rem",
          textAlign: "center",
          color: "var(--text, #e5e5e5)",
        }}>
          <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>😵</p>
          <h3 style={{ marginBottom: "0.5rem" }}>{t("errorBoundary.title")}</h3>
          <p style={{ fontSize: "0.9rem", opacity: 0.7, marginBottom: "1rem" }}>
            {this.props.name
              ? t("errorBoundary.errorIn", { name: this.props.name })
              : t("errorBoundary.genericError")}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: "0.5rem 1.5rem",
              borderRadius: "8px",
              border: "none",
              background: "var(--accent, #3b82f6)",
              color: "#fff",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            {t("errorBoundary.retry")}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
