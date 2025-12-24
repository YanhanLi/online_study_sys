package xyz.playedu.course.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import xyz.playedu.course.domain.UserQuizRecord;

@Mapper
public interface UserQuizRecordMapper extends BaseMapper<UserQuizRecord> {

    @Select(
            "SELECT * FROM ( "
                    + "  SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY score DESC,"
                    + " created_at ASC) as rn "
                    + "  FROM user_quiz_records "
                    + "  WHERE score IS NOT NULL "
                    + ") t "
                    + "WHERE rn = 1 "
                    + "ORDER BY score DESC, created_at ASC "
                    + "LIMIT #{limit}")
    List<UserQuizRecord> getTopScoreRecords(@Param("limit") int limit);
}
