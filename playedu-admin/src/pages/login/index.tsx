import { useState } from "react";
import styles from "./index.module.less";
import { Input, Button, message } from "antd";
import { login as loginApi, system } from "../../api/index";
import { setToken } from "../../utils/index";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import icon from "../../assets/images/login/ustclogo.png";
import "./login.less";
import { loginAction } from "../../store/user/loginUserSlice";
import {
  SystemConfigStoreInterface,
  saveConfigAction,
} from "../../store/system/systemConfigSlice";
import { Footer } from "../../compenents/footer";

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const loginSubmit = async () => {
    if (!email) {
      message.error("请输入管理员邮箱账号");
      return;
    }
    if (!password) {
      message.error("请输入密码");
      return;
    }
    await handleSubmit();
  };

  const handleSubmit = async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      let res: any = await loginApi.login(email, password);
      setToken(res.data.token); //将token写入本地

      // 获取系统配置，失败也继续
      try {
        await getSystemConfig();
      } catch (configErr) {
        console.error("获取系统配置失败", configErr);
      }

      // 获取用户信息，失败也继续
      try {
        await getUser();
      } catch (userErr) {
        console.error("获取用户信息失败", userErr);
      }

      navigate("/", { replace: true });
    } catch (e) {
      console.error("登录错误信息", e);
      setLoading(false);
    }
  };

  const getUser = async () => {
    let res: any = await loginApi.getUser();
    dispatch(loginAction(res.data));
  };

  const getSystemConfig = async () => {
    let res: any = await system.getSystemConfig();
    let data: SystemConfigStoreInterface = {
      "ldap-enabled": res.data["ldap-enabled"],
      systemName: res.data["system.name"],
      systemLogo: res.data["system.logo"],
      systemPcUrl: res.data["system.pc_url"],
      systemH5Url: res.data["system.h5_url"],
      resourceUrl: res.data["resource_url"],
      memberDefaultAvatar: res.data["member.default_avatar"],
      courseDefaultThumbs: res.data["default.course_thumbs"],
      departments: res.data["departments"],
      resourceCategories: res.data["resource_categories"],
    };
    dispatch(saveConfigAction(data));
  };

  const keyUp = (e: any) => {
    if (e.keyCode === 13) {
      loginSubmit();
    }
  };

  return (
    <div className={styles["login-content"]}>
      <div className={styles["login-box"]}>
        <div className={styles["left-box"]}>
          <img className={styles["icon"]} src={icon} alt="" />
        </div>
        <div className={styles["right-box"]}>
          <div className={styles["title"]}>后台登录</div>
          <div className="login-box d-flex mt-50">
            <Input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              style={{ width: 400, height: 54 }}
              placeholder="请输入管理员邮箱账号"
              allowClear
              onKeyUp={(e) => keyUp(e)}
            />
          </div>
          <div className="login-box d-flex mt-50">
            <Input.Password
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              allowClear
              style={{ width: 400, height: 54 }}
              placeholder="请输入密码"
              onKeyUp={(e) => keyUp(e)}
            />
          </div>
          <div className="login-box d-flex mt-50">
            <Button
              style={{ width: 400, height: 54 }}
              type="primary"
              onClick={loginSubmit}
              loading={loading}
            >
              立即登录
            </Button>
          </div>
        </div>
      </div>
      <div className={styles["footer-box"]}>
        <Footer type="none"></Footer>
      </div>
    </div>
  );
};

export default LoginPage;
