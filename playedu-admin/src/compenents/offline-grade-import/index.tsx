import { useState } from "react";
import {
  Alert,
  Button,
  Modal,
  Space,
  Table,
  Upload,
  Typography,
  message,
} from "antd";
import type { UploadProps } from "antd";
import type { RcFile } from "antd/es/upload";
import type { ColumnsType } from "antd/es/table";
import { InboxOutlined, DownloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import { grade as gradeApi } from "../../api";

interface OfflineImportModalProps {
  open: boolean;
  quiz?: { id: number; title: string };
  onCancel: () => void;
  onImported: () => void;
}

interface PreviewRow {
  sno: string;
  name: string;
  score: number;
  examDate?: string;
  comment?: string;
}

const columns: ColumnsType<PreviewRow> = [
  {
    title: "工号",
    dataIndex: "sno",
    width: 120,
  },
  {
    title: "姓名",
    dataIndex: "name",
    width: 120,
  },
  {
    title: "分数",
    dataIndex: "score",
    width: 100,
  },
  {
    title: "考试日期",
    dataIndex: "examDate",
    width: 180,
  },
  {
    title: "备注",
    dataIndex: "comment",
  },
];

const MAX_PREVIEW_ROWS = 10;

function sanitizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "_");
}

function parseSheetToPreview(sheet: XLSX.Sheet): PreviewRow[] {
  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
  if (!raw || raw.length === 0) {
    return [];
  }
  const [, ...rows] = raw;
  return rows
    .filter((row) => Array.isArray(row) && row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== ""))
    .map((row) => {
      const [sno, name, score, examDate, comment] = row;
      return {
        sno: sno ? String(sno) : "",
        name: name ? String(name) : "",
        score: Number(score ?? 0),
        examDate: examDate ? String(examDate) : undefined,
        comment: comment ? String(comment) : undefined,
      };
    })
    .slice(0, MAX_PREVIEW_ROWS);
}

async function readPreviewFromFile(file: File): Promise<PreviewRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    return [];
  }
  return parseSheetToPreview(sheet);
}

export const OfflineImportModal: React.FC<OfflineImportModalProps> = ({
  open,
  quiz,
  onCancel,
  onImported,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);

  const resetFile = () => {
    setFile(null);
    setPreviewRows([]);
  };

  const uploadProps: UploadProps = {
    multiple: false,
    showUploadList: false,
    accept: ".xlsx,.xls",
    beforeUpload: async (selected: RcFile) => {
      try {
        const preview = await readPreviewFromFile(selected as File);
        if (preview.length === 0) {
          message.warning("未解析到有效数据，请确认模板内容");
        }
        setFile(selected as File);
        setPreviewRows(preview);
      } catch (err: any) {
        message.error(err?.message || "解析文件失败，请检查文件格式");
        resetFile();
      }
      return false;
    },
  };

  const handleDownloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["工号", "姓名", "分数", "考试日期", "备注"],
      ["E001", "张三", 85, "2024-06-01 09:00:00", ""],
      ["E002", "李四", 72, "2024-06-01 09:00:00", "补考名单"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "成绩导入模板");
    const titleSuffix = quiz?.title ? `-${sanitizeFileName(quiz.title)}` : "";
    XLSX.writeFile(workbook, `成绩导入模板${titleSuffix}.xlsx`);
  };

  const handleOk = async () => {
    if (!quiz) {
      message.warning("请选择要导入的练习");
      return;
    }
    if (!file) {
      message.warning("请先选择Excel成绩文件");
      return;
    }
    setLoading(true);
    try {
      await gradeApi.importOfflineGrade(quiz.id, file);
      message.success("成绩导入成功");
      resetFile();
      onImported();
    } catch (err: any) {
      message.error(err?.message || "导入失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`线下成绩导入${quiz ? ` - ${quiz.title}` : ""}`}
      onCancel={() => {
        resetFile();
        onCancel();
      }}
      okText="立即导入"
      confirmLoading={loading}
      okButtonProps={{ disabled: !file }}
      width={720}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <Alert
          type="info"
          showIcon
          message="请使用系统提供的模板，并确保工号与平台用户账号一致。"
        />
        <Space>
          <Upload.Dragger {...uploadProps} style={{ width: 320 }}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽上传成绩文件</p>
            <p className="ant-upload-hint">支持 .xlsx / .xls</p>
          </Upload.Dragger>
          <div>
            <Typography.Paragraph type="secondary">
              支持下载模板后统一填写，再上传至系统。
            </Typography.Paragraph>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
              type="default"
            >
              下载模板
            </Button>
          </div>
        </Space>
        {file && (
          <Typography.Paragraph>
            已选择文件：
            <Typography.Text strong>{file.name}</Typography.Text>
            <Button type="link" size="small" onClick={resetFile}>
              重新选择
            </Button>
          </Typography.Paragraph>
        )}
        <Table<PreviewRow>
          size="small"
          bordered
          columns={columns}
          dataSource={previewRows}
          pagination={false}
          locale={{ emptyText: file ? "无可预览数据" : "请先上传文件" }}
          rowKey={(row, index) => `${row.sno || "-"}-${index}`}
        />
      </Space>
    </Modal>
  );
};
