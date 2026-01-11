import React from "react";
import { Layout } from "antd";
import { Link } from "react-router-dom";

export const Footer: React.FC = () => {
  return (
    <Layout.Footer
      style={{
        backgroundColor: "#333333",
        height: 90,
        textAlign: "center",
        marginTop: 80,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#cccccc",
          fontSize: 14,
        }}
      >
        <span>© 2024 My Personal Project. All Rights Reserved.</span>
      </div>
    </Layout.Footer>
  );
};
