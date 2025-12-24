import React from "react";
import { Layout } from "antd";
import { Link } from "react-router-dom";

interface PropInterface {
  type?: string;
}

export const Footer: React.FC<PropInterface> = ({ type }) => {
  return (
    <Layout.Footer
      style={{
        width: "100%",
        background: type === "none" ? "none" : "#F6F6F6",
        height: 166,
        paddingTop: 80,
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#cccccc",
          fontSize: 14,
        }}
      >
        <span></span>
      </div>
    </Layout.Footer>
  );
};
