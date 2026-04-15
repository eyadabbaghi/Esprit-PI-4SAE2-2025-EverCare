SET @password_column_nullable = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'password'
      AND is_nullable = 'NO'
);

SET @users_password_ddl = IF(
    @password_column_nullable > 0,
    'ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL',
    'SELECT 1'
);

PREPARE stmt FROM @users_password_ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
