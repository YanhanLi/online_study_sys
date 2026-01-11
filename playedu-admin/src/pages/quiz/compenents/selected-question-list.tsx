import { Button, Space, Tag, Typography } from "antd";
import type { QuestionDetailModel } from "../../question/compenents/form";
import { QUESTION_TYPE_MAP } from "../../../constants/question";
import styles from "./selected-question.module.less";

interface SelectedQuestionListProps {
  items: QuestionDetailModel[];
  onRemove: (id: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export const SelectedQuestionList: React.FC<SelectedQuestionListProps> = ({
  items,
  onRemove,
  onMoveUp,
  onMoveDown,
}) => {
  if (items.length === 0) {
    return <div className={styles.empty}>请先选择题目</div>;
  }

  return (
    <div className={styles.list}>
      {items.map((item, index) => (
        <div key={item.id} className={styles.item}>
          <div className={styles.info}>
            <Space size={12} align="start">
              <Tag color="red">{QUESTION_TYPE_MAP[item.type]}</Tag>
              <div>
                <Typography.Text strong>
                  {index + 1}. {item.content}
                </Typography.Text>
                <div className={styles.meta}>分值：{item.score}</div>
              </div>
            </Space>
          </div>
          <Space>
            <Button
              size="small"
              disabled={index === 0}
              onClick={() => onMoveUp(index)}
            >
              上移
            </Button>
            <Button
              size="small"
              disabled={index === items.length - 1}
              onClick={() => onMoveDown(index)}
            >
              下移
            </Button>
            <Button size="small" danger onClick={() => onRemove(item.id)}>
              移除
            </Button>
          </Space>
        </div>
      ))}
    </div>
  );
};
