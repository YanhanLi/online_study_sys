package xyz.playedu.course.types;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OfflineGradeImportResult {
    private int totalRows;
    private int successCount;
    private int skippedCount;
    private List<String> errors;
}
