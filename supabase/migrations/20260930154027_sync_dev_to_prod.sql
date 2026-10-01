drop extension if exists "pg_net";

drop trigger if exists "protect_bucket_control_insert" on "storage"."buckets";

drop trigger if exists "protect_bucket_control_update" on "storage"."buckets";

drop trigger if exists "protect_bucket_control_update_role" on "storage"."buckets";


