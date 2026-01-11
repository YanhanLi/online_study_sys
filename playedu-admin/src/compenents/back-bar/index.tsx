import { Button } from "antd";
import styles from "./index.module.less";
import { useNavigate } from "react-router-dom";
import { LeftOutlined } from "@ant-design/icons";

interface PropInterface {
  title: string;
}

export const BackBartment = (props: PropInterface) => {
  const navigate = useNavigate();
  return (
    <div className={styles["back-bar-box"]}>
      <Button
        type="text"
        className={styles["back-button"]}
        icon={<LeftOutlined />}
        onClick={() => navigate(-1)}
      >
        返回
      </Button>
      <div className={styles["name"]}>{props.title}</div>
    </div>
  );
};
