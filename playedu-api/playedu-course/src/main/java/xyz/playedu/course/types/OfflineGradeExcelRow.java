package xyz.playedu.course.types;

import com.alibaba.excel.annotation.ExcelProperty;
import lombok.Data;

@Data
public class OfflineGradeExcelRow {
    @ExcelProperty(value = {"账号"}, index = 0)
    private String account;

    @ExcelProperty(value = {"分数"}, index = 1)
    private Double score;

    @ExcelProperty(value = {"评语"}, index = 2)
    private String comment;
}
