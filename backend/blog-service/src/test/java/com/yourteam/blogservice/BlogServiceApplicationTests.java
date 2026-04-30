package com.yourteam.blogservice;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@Disabled("Requires MySQL database - run manually or with integration tests")
class BlogServiceApplicationTests {

    @Test
    void contextLoads() {
    }

}
