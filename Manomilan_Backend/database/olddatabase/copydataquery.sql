-- =====================================================================
--  copydataquery.sql  (MariaDB)  OLD `demo_manomilan`  ->  NEW `demo_newmanomilan`
--  Run on the server hosting both databases, after backing up both. Review errors and row-count checks.
--  * Data is sourced dynamically from the old DB. INSERT IGNORE can skip key/unique conflicts; review final checks.
--  * Existing same-key profile rows are skipped. New profile and photo data are copied in one INSERT ... SELECT.
--  * Photos: each photo goes into its own column: profile_photo -> selfie_photo -> full_body_photo -> half_body_photo.
--    Pool order: old profilePhoto, old additional_photos, melava_registrations.candidate_photos, melava pending photos.
--    Only photos beyond 4 stay in additional_photos (JSON) so nothing is lost.
--  * No helper, temporary, or legacy tables are created; unmapped columns remain only in the old database.
--  BACK UP BOTH demo_manomilan AND demo_newmanomilan FIRST. This script has not been run against your live DB.
-- =====================================================================
SET SESSION sql_mode = 'NO_AUTO_VALUE_ON_ZERO';
SET SESSION group_concat_max_len = 10000000;
SET FOREIGN_KEY_CHECKS = 0;

-- ===== 1. SAME-NAME TABLES (all columns, original ids kept, existing rows skipped)
INSERT IGNORE INTO `demo_newmanomilan`.`roles` (`id`, `name`, `user_type`, `created_at`, `updated_at`)
SELECT o.`id`, o.`name`, o.`user_type`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`roles` o;

INSERT IGNORE INTO `demo_newmanomilan`.`applications` (`id`, `app_code`, `app_name`, `description`, `current_version`, `base_url`, `api_key`, `status`, `created_at`, `updated_at`)
SELECT o.`id`, o.`app_code`, o.`app_name`, o.`description`, o.`current_version`, o.`base_url`, o.`api_key`, o.`status`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`applications` o;

INSERT IGNORE INTO `demo_newmanomilan`.`modules` (`id`, `application_id`, `module_name`, `description`, `status`, `created_at`, `updated_at`)
SELECT o.`id`, o.`application_id`, o.`module_name`, o.`description`, o.`status`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`modules` o;

INSERT IGNORE INTO `demo_newmanomilan`.`users` (`id`, `profile_id`, `name`, `email`, `email_verified_at`, `username`, `password`, `status`, `is_password_changed`, `user_type`, `role_id`, `remember_token`, `created_at`, `updated_at`)
SELECT o.`id`, o.`profile_id`, o.`name`, o.`email`, o.`email_verified_at`, o.`username`, o.`password`, o.`status`, o.`is_password_changed`, o.`user_type`, o.`role_id`, o.`remember_token`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`users` o;

-- Duplicate usernames are skipped here; review the final query to identify those users.
INSERT IGNORE INTO `demo_newmanomilan`.`melava_pending_registrations` (`id`, `token`, `mobile`, `is_existing_website_user`, `user_id`, `profile_id`, `registration_data`, `status`, `expires_at`, `created_at`, `updated_at`)
SELECT o.`id`, o.`token`, o.`mobile`, o.`is_existing_website_user`, o.`user_id`, o.`profile_id`, o.`registration_data`, o.`status`, o.`expires_at`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`melava_pending_registrations` o;

INSERT IGNORE INTO `demo_newmanomilan`.`document_verifications` (`id`, `profile_id`, `identificationProof_status`, `birthDateProof_status`, `addressProof_status`, `educationProof_status`, `professionProof_status`, `incomeProof_status`, `casteCertificate_status`, `medicalFitnessCertificate_status`, `selfieVerification_status`, `identificationProof_remarks`, `birthDateProof_remarks`, `addressProof_remarks`, `educationProof_remarks`, `professionProof_remarks`, `incomeProof_remarks`, `casteCertificate_remarks`, `medicalFitnessCertificate_remarks`, `selfieVerification_remarks`, `created_at`, `updated_at`)
SELECT o.`id`, o.`profile_id`, o.`identificationProof_status`, o.`birthDateProof_status`, o.`addressProof_status`, o.`educationProof_status`, o.`professionProof_status`, o.`incomeProof_status`, o.`casteCertificate_status`, o.`medicalFitnessCertificate_status`, o.`selfieVerification_status`, o.`identificationProof_remarks`, o.`birthDateProof_remarks`, o.`addressProof_remarks`, o.`educationProof_remarks`, o.`professionProof_remarks`, o.`incomeProof_remarks`, o.`casteCertificate_remarks`, o.`medicalFitnessCertificate_remarks`, o.`selfieVerification_remarks`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`document_verifications` o;

INSERT IGNORE INTO `demo_newmanomilan`.`enquiries` (`id`, `profilePhoto`, `melavaNo`, `name`, `address`, `city`, `taluka`, `dist`, `contactPersonName1`, `contactPersonMobile1`, `contactPersonName2`, `contactPersonMobile2`, `contactPersonName3`, `contactPersonMobile3`, `email`, `education`, `gender`, `DOB`, `time`, `place`, `height`, `potJat`, `parentName`, `job`, `monthlyIncome`, `expectation`, `extraInformation`, `location`, `mobileNo`, `status`, `created_at`, `updated_at`, `updated_by`)
SELECT o.`id`, o.`profilePhoto`, o.`melavaNo`, o.`name`, o.`address`, o.`city`, o.`taluka`, o.`dist`, o.`contactPersonName1`, o.`contactPersonMobile1`, o.`contactPersonName2`, o.`contactPersonMobile2`, o.`contactPersonName3`, o.`contactPersonMobile3`, o.`email`, o.`education`, o.`gender`, o.`DOB`, o.`time`, o.`place`, o.`height`, o.`potJat`, o.`parentName`, o.`job`, o.`monthlyIncome`, o.`expectation`, o.`extraInformation`, o.`location`, o.`mobileNo`, o.`status`, o.`created_at`, o.`updated_at`, o.`updated_by` FROM `demo_manomilan`.`enquiries` o;

INSERT IGNORE INTO `demo_newmanomilan`.`failed_jobs` (`id`, `connection`, `queue`, `payload`, `exception`, `failed_at`)
SELECT o.`id`, o.`connection`, o.`queue`, o.`payload`, o.`exception`, o.`failed_at` FROM `demo_manomilan`.`failed_jobs` o;

INSERT IGNORE INTO `demo_newmanomilan`.`meetings` (`id`, `candidate_id`, `place`, `date`, `time_slot`, `spoke_to_matched_parents`, `spoke_to_candidate`, `other_candidate_id`, `day`, `spoke_to_matched_profile`, `spoke_to_cand_parents`, `remark`, `created_at`, `updated_at`)
SELECT o.`id`, o.`candidate_id`, o.`place`, o.`date`, o.`time_slot`, o.`spoke_to_matched_parents`, o.`spoke_to_candidate`, o.`other_candidate_id`, o.`day`, o.`spoke_to_matched_profile`, o.`spoke_to_cand_parents`, o.`remark`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`meetings` o;

INSERT IGNORE INTO `demo_newmanomilan`.`password_resets` (`email`, `token`, `created_at`)
SELECT o.`email`, o.`token`, o.`created_at` FROM `demo_manomilan`.`password_resets` o;

INSERT IGNORE INTO `demo_newmanomilan`.`payments` (`id`, `user_id`, `photo_upload`, `created_at`, `updated_at`, `updated_by`)
SELECT o.`id`, o.`user_id`, o.`photo_upload`, o.`created_at`, o.`updated_at`, o.`updated_by` FROM `demo_manomilan`.`payments` o;

INSERT IGNORE INTO `demo_newmanomilan`.`payment_screenshots` (`id`, `profile_id`, `screenshot_path`, `payment_verified`, `created_at`, `updated_at`)
SELECT o.`id`, o.`profile_id`, o.`screenshot_path`, o.`payment_verified`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`payment_screenshots` o;

INSERT IGNORE INTO `demo_newmanomilan`.`preferences` (`id`, `user_id`, `preferred_religion`, `preferred_caste`, `preferred_sub_caste`, `age_from`, `age_to`, `height_from`, `height_to`, `preferred_education`, `working_partner`, `preferred_working_field`, `expected_income`, `family_type`, `financial_background`, `family_values`, `preferred_body_type`, `preferred_location`, `preferred_country`, `preferred_state`, `preferred_city`, `other_expectations`, `created_at`, `updated_at`)
SELECT o.`id`, o.`user_id`, o.`preferred_religion`, o.`preferred_caste`, o.`preferred_sub_caste`, o.`age_from`, o.`age_to`, o.`height_from`, o.`height_to`, o.`preferred_education`, o.`working_partner`, o.`preferred_working_field`, o.`expected_income`, o.`family_type`, o.`financial_background`, o.`family_values`, o.`preferred_body_type`, o.`preferred_location`, o.`preferred_country`, o.`preferred_state`, o.`preferred_city`, o.`other_expectations`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`preferences` o;

INSERT IGNORE INTO `demo_newmanomilan`.`profile_visitors` (`id`, `profile_id`, `visitor_id`, `created_at`, `updated_at`)
SELECT o.`id`, o.`profile_id`, o.`visitor_id`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`profile_visitors` o;

INSERT IGNORE INTO `demo_newmanomilan`.`success_stories` (`id`, `groom_name`, `bride_name`, `marriage_date`, `city`, `state`, `groom_photo`, `bride_photo`, `couple_photo`, `wedding_photo`, `story_title`, `short_description`, `full_story`, `family_message`, `rating`, `is_featured`, `display_order`, `status`, `created_by`, `created_at`, `updated_at`, `deleted_at`)
SELECT o.`id`, o.`groom_name`, o.`bride_name`, o.`marriage_date`, o.`city`, o.`state`, o.`groom_photo`, o.`bride_photo`, o.`couple_photo`, o.`wedding_photo`, o.`story_title`, o.`short_description`, o.`full_story`, o.`family_message`, o.`rating`, o.`is_featured`, o.`display_order`, o.`status`, o.`created_by`, o.`created_at`, o.`updated_at`, o.`deleted_at` FROM `demo_manomilan`.`success_stories` o;

INSERT IGNORE INTO `demo_newmanomilan`.`tickets` (`id`, `ticket_no`, `application_id`, `module_id`, `user_id`, `subject`, `description`, `category`, `ticket_status`, `attachment`, `status`, `created_at`, `updated_at`)
SELECT o.`id`, o.`ticket_no`, o.`application_id`, o.`module_id`, o.`user_id`, o.`subject`, o.`description`, o.`category`, o.`ticket_status`, o.`attachment`, o.`status`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`tickets` o;

INSERT IGNORE INTO `demo_newmanomilan`.`ticket_items` (`id`, `ticket_id`, `attachment`, `title`, `description`, `item_type`, `priority`, `severity`, `ticket_status`, `status`, `created_at`, `updated_at`)
SELECT o.`id`, o.`ticket_id`, o.`attachment`, o.`title`, o.`description`, o.`item_type`, o.`priority`, o.`severity`, o.`ticket_status`, o.`status`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`ticket_items` o;

INSERT IGNORE INTO `demo_newmanomilan`.`ticket_comments` (`id`, `ticket_id`, `ticket_item_id`, `comment_by`, `user_id`, `comment`, `attachment`, `is_internal`, `created_at`, `updated_at`)
SELECT o.`id`, o.`ticket_id`, o.`ticket_item_id`, o.`comment_by`, o.`user_id`, o.`comment`, o.`attachment`, o.`is_internal`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`ticket_comments` o;

INSERT IGNORE INTO `demo_newmanomilan`.`ticket_status_history` (`id`, `ticket_id`, `ticket_item_id`, `old_status`, `new_status`, `remarks`, `changed_by`, `created_at`)
SELECT o.`id`, o.`ticket_id`, o.`ticket_item_id`, o.`old_status`, o.`new_status`, o.`remarks`, o.`changed_by`, o.`created_at` FROM `demo_manomilan`.`ticket_status_history` o;

INSERT IGNORE INTO `demo_newmanomilan`.`user_interests` (`id`, `user_id`, `profile_id`, `created_at`, `updated_at`, `status`)
SELECT o.`id`, o.`user_id`, o.`profile_id`, o.`created_at`, o.`updated_at`, o.`status` FROM `demo_manomilan`.`user_interests` o;

INSERT IGNORE INTO `demo_newmanomilan`.`workshop_registrations` (`id`, `full_name`, `mobile_number`, `whatsapp_number`, `date_of_birth`, `education`, `city`, `district`, `marital_status`, `parent_name`, `parent_contact_number`, `payment_screenshot`, `transaction_id`, `consent`, `status`, `remarks`, `created_at`, `updated_at`)
SELECT o.`id`, o.`full_name`, o.`mobile_number`, o.`whatsapp_number`, o.`date_of_birth`, o.`education`, o.`city`, o.`district`, o.`marital_status`, o.`parent_name`, o.`parent_contact_number`, o.`payment_screenshot`, o.`transaction_id`, o.`consent`, o.`status`, o.`remarks`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`workshop_registrations` o WHERE o.transaction_id IS NULL OR CHAR_LENGTH(o.transaction_id) <= 22;


-- ===== 2. PROFILES: insert every old profile that is not in the new table yet (ALL records incl. duplicate-phone ones)
--  If a phone / registration number is already used by another profile (new columns are UNIQUE) it is left NULL here;
--  the original value remains only in the old database.
INSERT IGNORE INTO `demo_newmanomilan`.`profiles`
 (id, reg_id, groomorbride, full_name, email, source_of_information, phone, birth_date, marital_status, height_cm, weight_kg,
  has_spectacles, blood_group, mother_tongue, languages, special_cases, about_me, profile_photo, selfie_photo, full_body_photo,
  half_body_photo, candidate_photos, additional_photos, monthly_income, annual_income,
  personal_medical_history, current_medical_problems, medications, has_medical_history, birth_place, birth_time,
  creator_relation, profile_creator_name, verification_status, status, created_at, updated_at, profile_completion)
SELECT o.id,
  CASE WHEN NULLIF(o.registration_number,'') IS NOT NULL AND o.id=(SELECT MIN(z.id) FROM `demo_manomilan`.`profiles` z WHERE z.registration_number=o.registration_number)
        AND NOT EXISTS (SELECT 1 FROM `demo_newmanomilan`.`profiles` y WHERE y.reg_id=o.registration_number AND y.id<>o.id) THEN o.registration_number END,
  CASE LOWER(o.groomOrBride) WHEN 'bride' THEN 'Bride' ELSE 'Groom' END, o.fullName, o.email, o.source_of_information,
  CASE WHEN NULLIF(o.phone,'') IS NOT NULL AND CHAR_LENGTH(o.phone)<=20 AND o.id=(SELECT MIN(z.id) FROM `demo_manomilan`.`profiles` z WHERE z.phone=o.phone)
        AND NOT EXISTS (SELECT 1 FROM `demo_newmanomilan`.`profiles` y WHERE y.phone=o.phone AND y.id<>o.id) THEN o.phone END,
  o.birthDate, o.maritalStatus, (CASE WHEN o.height REGEXP '^[0-9]+([.][0-9]+)?ft [0-9]+([.][0-9]+)?in$' AND ROUND((CAST(SUBSTRING_INDEX(o.height,'ft',1) AS DECIMAL(6,2))*12+CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(o.height,'ft ',-1),'in',1) AS DECIMAL(6,2)))*2.54,2) BETWEEN 90 AND 250 THEN ROUND((CAST(SUBSTRING_INDEX(o.height,'ft',1) AS DECIMAL(6,2))*12+CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(o.height,'ft ',-1),'in',1) AS DECIMAL(6,2)))*2.54,2) END),
  CASE WHEN REPLACE(REPLACE(LOWER(TRIM(o.weight)),'kg',''),' ','') REGEXP '^[0-9]{1,3}([.][0-9]{1,2})?$' AND CAST(REPLACE(REPLACE(LOWER(TRIM(o.weight)),'kg',''),' ','') AS DECIMAL(6,2)) BETWEEN 20 AND 300 THEN CAST(REPLACE(REPLACE(LOWER(TRIM(o.weight)),'kg',''),' ','') AS DECIMAL(5,2)) END,
  (CASE o.havingSpecsLenses WHEN 'Yes' THEN 1 WHEN 'No' THEN 0 END), o.bloodGroup, o.motherTongue,
  CASE WHEN o.language IS NULL OR o.language='' THEN NULL ELSE JSON_ARRAY(o.language) END,
  o.specialCases, o.knowAboutMyself,
  photo_data.profile_photo, photo_data.selfie_photo, photo_data.full_body_photo, photo_data.half_body_photo,
  photo_data.candidate_photos, photo_data.additional_photos,
  (CASE WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.monthlyIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') REGEXP '^[0-9]{1,13}([.][0-9]{1,2})?$' THEN CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.monthlyIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') AS DECIMAL(15,2)) END), (CASE WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.annualIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') REGEXP '^[0-9]{1,13}([.][0-9]{1,2})?$' THEN CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.annualIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') AS DECIMAL(15,2)) END), o.personalMedicalHistory, o.currentMedicalProblems, o.medications, (CASE o.hasMedicalHistory WHEN 'Yes' THEN 1 WHEN 'No' THEN 0 END), o.placeOfBirth, o.timeOfBirth,
  NULLIF(o.profileCreatorRelation,''), o.profileCreatorName, o.profileVerificationStatus, o.active, o.created_at, o.updated_at, o.profile_completion
FROM `demo_manomilan`.`profiles` o
LEFT JOIN (
  SELECT ranked.profile_id,
    MAX(CASE WHEN ranked.photo_number=1 THEN ranked.path END) AS profile_photo,
    MAX(CASE WHEN ranked.photo_number=2 THEN ranked.path END) AS selfie_photo,
    MAX(CASE WHEN ranked.photo_number=3 THEN ranked.path END) AS full_body_photo,
    MAX(CASE WHEN ranked.photo_number=4 THEN ranked.path END) AS half_body_photo,
    MAX(candidates.candidate_photos) AS candidate_photos,
    CASE WHEN SUM(ranked.photo_number>4)=0 THEN NULL
      ELSE CONCAT('[',GROUP_CONCAT(CASE WHEN ranked.photo_number>4 THEN JSON_QUOTE(ranked.path) END ORDER BY ranked.photo_number SEPARATOR ','),']')
    END AS additional_photos
  FROM (
    SELECT deduplicated.profile_id, deduplicated.ord1, deduplicated.ord2, deduplicated.n, deduplicated.kind, deduplicated.path,
      ROW_NUMBER() OVER (PARTITION BY deduplicated.profile_id ORDER BY deduplicated.ord1, deduplicated.ord2, deduplicated.n, deduplicated.kind) AS photo_number
    FROM (
      SELECT photo_items.*,
        ROW_NUMBER() OVER (PARTITION BY photo_items.profile_id, BINARY photo_items.path ORDER BY photo_items.ord1, photo_items.ord2, photo_items.n, photo_items.kind) AS duplicate_number
      FROM (
        SELECT sources.profile_id, sources.ord1, sources.ord2, sources.kind, numbers.n,
          NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(sources.arr, CONCAT('$[',numbers.n,']')))),'') AS path
        FROM (
          SELECT o.id AS profile_id, 1 AS ord1, 0 AS ord2, 'p' AS kind, JSON_ARRAY(o.profilePhoto) AS arr
          FROM `demo_manomilan`.`profiles` o
          WHERE o.profilePhoto IS NOT NULL AND o.profilePhoto NOT IN ('','default.png')
          UNION ALL
          SELECT x.id, 2, 0, 'a', x.arr FROM (
            SELECT o.id, CASE WHEN o.additional_photos IS NULL OR o.additional_photos IN ('','null','[]') OR NOT JSON_VALID(o.additional_photos) THEN NULL
              WHEN JSON_TYPE(o.additional_photos)='STRING' THEN CASE WHEN JSON_VALID(JSON_UNQUOTE(o.additional_photos)) THEN JSON_UNQUOTE(o.additional_photos) END
              ELSE o.additional_photos END AS arr
            FROM `demo_manomilan`.`profiles` o
          ) x WHERE x.arr IS NOT NULL AND JSON_TYPE(x.arr)='ARRAY'
          UNION ALL
          SELECT x.profile_id, 3, x.id, 'c', x.arr FROM (
            SELECT m.id, m.profile_id, CASE WHEN m.candidate_photos IS NULL OR m.candidate_photos IN ('','null','[]') OR NOT JSON_VALID(m.candidate_photos) THEN NULL
              WHEN JSON_TYPE(m.candidate_photos)='STRING' THEN CASE WHEN JSON_VALID(JSON_UNQUOTE(m.candidate_photos)) THEN JSON_UNQUOTE(m.candidate_photos) END
              ELSE m.candidate_photos END AS arr
            FROM `demo_manomilan`.`melava_registrations` m
            WHERE m.profile_id IS NOT NULL
          ) x WHERE x.arr IS NOT NULL AND JSON_TYPE(x.arr)='ARRAY'
          UNION ALL
          SELECT x.profile_id, 4, x.id, 'p', JSON_ARRAY(x.profile_photo) FROM (
            SELECT q.id, q.profile_id, JSON_VALUE(q.registration_data,'$.profilePhoto') AS profile_photo
            FROM `demo_manomilan`.`melava_pending_registrations` q
            WHERE JSON_VALID(q.registration_data)
          ) x WHERE x.profile_photo IS NOT NULL AND x.profile_photo<>''
          UNION ALL
          SELECT x.profile_id, 5, x.id, 'c', x.arr FROM (
            SELECT q.id, q.profile_id, CASE WHEN JSON_VALUE(q.registration_data,'$.candidate_photos') IS NULL OR JSON_VALUE(q.registration_data,'$.candidate_photos') IN ('','null','[]') OR NOT JSON_VALID(JSON_VALUE(q.registration_data,'$.candidate_photos')) THEN NULL
              WHEN JSON_TYPE(JSON_VALUE(q.registration_data,'$.candidate_photos'))='STRING' THEN CASE WHEN JSON_VALID(JSON_UNQUOTE(JSON_VALUE(q.registration_data,'$.candidate_photos'))) THEN JSON_UNQUOTE(JSON_VALUE(q.registration_data,'$.candidate_photos')) END
              ELSE JSON_VALUE(q.registration_data,'$.candidate_photos') END AS arr
            FROM `demo_manomilan`.`melava_pending_registrations` q
            WHERE JSON_VALID(q.registration_data) AND q.profile_id IS NOT NULL
          ) x WHERE x.arr IS NOT NULL AND JSON_TYPE(x.arr)='ARRAY'
          UNION ALL
          SELECT x.profile_id, 6, x.id, 'a', x.arr FROM (
            SELECT q.id, q.profile_id, CASE WHEN JSON_VALUE(q.registration_data,'$.additionalPhotos') IS NULL OR JSON_VALUE(q.registration_data,'$.additionalPhotos') IN ('','null','[]') OR NOT JSON_VALID(JSON_VALUE(q.registration_data,'$.additionalPhotos')) THEN NULL
              WHEN JSON_TYPE(JSON_VALUE(q.registration_data,'$.additionalPhotos'))='STRING' THEN CASE WHEN JSON_VALID(JSON_UNQUOTE(JSON_VALUE(q.registration_data,'$.additionalPhotos'))) THEN JSON_UNQUOTE(JSON_VALUE(q.registration_data,'$.additionalPhotos')) END
              ELSE JSON_VALUE(q.registration_data,'$.additionalPhotos') END AS arr
            FROM `demo_manomilan`.`melava_pending_registrations` q
            WHERE JSON_VALID(q.registration_data) AND q.profile_id IS NOT NULL
          ) x WHERE x.arr IS NOT NULL AND JSON_TYPE(x.arr)='ARRAY'
        ) sources
        JOIN (
          SELECT a.n+b.n*10 AS n
          FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
          CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
        ) numbers ON numbers.n<JSON_LENGTH(sources.arr)
      ) photo_items
      WHERE photo_items.path IS NOT NULL AND photo_items.path<>'default.png'
    ) deduplicated
    WHERE deduplicated.duplicate_number=1
  ) ranked
  LEFT JOIN (
    SELECT candidate_items.profile_id,
      CONCAT('[',GROUP_CONCAT(JSON_QUOTE(candidate_items.path) ORDER BY candidate_items.ord1, candidate_items.ord2, candidate_items.n SEPARATOR ','),']') AS candidate_photos
    FROM (
      SELECT raw_candidates.*,
        ROW_NUMBER() OVER (PARTITION BY raw_candidates.profile_id, BINARY raw_candidates.path ORDER BY raw_candidates.ord1, raw_candidates.ord2, raw_candidates.n) AS duplicate_number
      FROM (
        SELECT sources.profile_id, sources.ord1, sources.ord2, numbers.n,
          NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(sources.arr, CONCAT('$[',numbers.n,']')))),'') AS path
        FROM (
          SELECT x.profile_id, 3 AS ord1, x.id AS ord2, x.arr
          FROM (
            SELECT m.id, m.profile_id, CASE WHEN m.candidate_photos IS NULL OR m.candidate_photos IN ('','null','[]') OR NOT JSON_VALID(m.candidate_photos) THEN NULL
              WHEN JSON_TYPE(m.candidate_photos)='STRING' THEN CASE WHEN JSON_VALID(JSON_UNQUOTE(m.candidate_photos)) THEN JSON_UNQUOTE(m.candidate_photos) END
              ELSE m.candidate_photos END AS arr
            FROM `demo_manomilan`.`melava_registrations` m
            WHERE m.profile_id IS NOT NULL
          ) x WHERE x.arr IS NOT NULL AND JSON_TYPE(x.arr)='ARRAY'
          UNION ALL
          SELECT x.profile_id, 5, x.id, x.arr
          FROM (
            SELECT q.id, q.profile_id, CASE WHEN JSON_VALUE(q.registration_data,'$.candidate_photos') IS NULL OR JSON_VALUE(q.registration_data,'$.candidate_photos') IN ('','null','[]') OR NOT JSON_VALID(JSON_VALUE(q.registration_data,'$.candidate_photos')) THEN NULL
              WHEN JSON_TYPE(JSON_VALUE(q.registration_data,'$.candidate_photos'))='STRING' THEN CASE WHEN JSON_VALID(JSON_UNQUOTE(JSON_VALUE(q.registration_data,'$.candidate_photos'))) THEN JSON_UNQUOTE(JSON_VALUE(q.registration_data,'$.candidate_photos')) END
              ELSE JSON_VALUE(q.registration_data,'$.candidate_photos') END AS arr
            FROM `demo_manomilan`.`melava_pending_registrations` q
            WHERE JSON_VALID(q.registration_data) AND q.profile_id IS NOT NULL
          ) x WHERE x.arr IS NOT NULL AND JSON_TYPE(x.arr)='ARRAY'
        ) sources
        JOIN (
          SELECT a.n+b.n*10 AS n
          FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
          CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
        ) numbers ON numbers.n<JSON_LENGTH(sources.arr)
      ) raw_candidates
      WHERE raw_candidates.path IS NOT NULL AND raw_candidates.path<>''
    ) candidate_items
    WHERE candidate_items.duplicate_number=1
    GROUP BY candidate_items.profile_id
  ) candidates ON candidates.profile_id=ranked.profile_id
  GROUP BY ranked.profile_id
) photo_data ON photo_data.profile_id=o.id
WHERE o.id NOT IN (SELECT id FROM `demo_newmanomilan`.`profiles`) ORDER BY o.id;

-- fill only EMPTY cells of already-migrated profiles (better height / income parsing)
UPDATE `demo_newmanomilan`.`profiles` n JOIN `demo_manomilan`.`profiles` o ON o.id=n.id
SET n.height_cm = COALESCE(n.height_cm, (CASE WHEN o.height REGEXP '^[0-9]+([.][0-9]+)?ft [0-9]+([.][0-9]+)?in$' AND ROUND((CAST(SUBSTRING_INDEX(o.height,'ft',1) AS DECIMAL(6,2))*12+CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(o.height,'ft ',-1),'in',1) AS DECIMAL(6,2)))*2.54,2) BETWEEN 90 AND 250 THEN ROUND((CAST(SUBSTRING_INDEX(o.height,'ft',1) AS DECIMAL(6,2))*12+CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(o.height,'ft ',-1),'in',1) AS DECIMAL(6,2)))*2.54,2) END)),
    n.monthly_income = COALESCE(n.monthly_income, (CASE WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.monthlyIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') REGEXP '^[0-9]{1,13}([.][0-9]{1,2})?$' THEN CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.monthlyIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') AS DECIMAL(15,2)) END)),
    n.annual_income = COALESCE(n.annual_income, (CASE WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.annualIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') REGEXP '^[0-9]{1,13}([.][0-9]{1,2})?$' THEN CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.annualIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') AS DECIMAL(15,2)) END));

-- ===== 3. PROFILE CHILD TABLES (new rows inserted; existing rows only get their EMPTY cells filled)
INSERT INTO `demo_newmanomilan`.`profile_education` (`id`, `profile_id`, `education_level`, `degree_name`, `specialization`, `university_name`, `education_city`, `additional_qualification`, `education_certificate`, `created_at`, `updated_at`)
SELECT o.id, o.id, NULLIF(o.education,''), NULLIF(o.degreeDiplomaName1,''), NULLIF(o.specialisation1,''), NULLIF(o.universityBoardCollege,''), NULLIF(o.cityOfEducation,''), NULLIF(CONCAT_WS(', ',NULLIF(o.additionalEducation1,''),NULLIF(o.additionalEducation2,'')),''), NULLIF(o.educationProof,''), o.created_at, o.updated_at
FROM `demo_manomilan`.`profiles` o JOIN `demo_newmanomilan`.`profiles` n ON n.id=o.id
ON DUPLICATE KEY UPDATE
  `education_level`=COALESCE(`profile_education`.`education_level`,VALUES(`education_level`)),
  `degree_name`=COALESCE(`profile_education`.`degree_name`,VALUES(`degree_name`)),
  `specialization`=COALESCE(`profile_education`.`specialization`,VALUES(`specialization`)),
  `university_name`=COALESCE(`profile_education`.`university_name`,VALUES(`university_name`)),
  `education_city`=COALESCE(`profile_education`.`education_city`,VALUES(`education_city`)),
  `additional_qualification`=COALESCE(`profile_education`.`additional_qualification`,VALUES(`additional_qualification`)),
  `education_certificate`=COALESCE(`profile_education`.`education_certificate`,VALUES(`education_certificate`));

-- second degree (degreeDiplomaName2 / specialisation2) as an extra education row
INSERT INTO `demo_newmanomilan`.`profile_education` (profile_id, education_level, degree_name, specialization, university_name, education_city, created_at, updated_at)
SELECT o.id, NULLIF(o.education,''), NULLIF(o.degreeDiplomaName2,''), NULLIF(o.specialisation2,''), NULLIF(o.universityBoardCollege,''), NULLIF(o.cityOfEducation,''), o.created_at, o.updated_at
FROM `demo_manomilan`.`profiles` o JOIN `demo_newmanomilan`.`profiles` n ON n.id=o.id WHERE (NULLIF(o.degreeDiplomaName2,'') IS NOT NULL OR NULLIF(o.specialisation2,'') IS NOT NULL)
 AND NOT EXISTS (SELECT 1 FROM `demo_newmanomilan`.`profile_education` e WHERE e.profile_id=o.id AND e.degree_name <=> NULLIF(o.degreeDiplomaName2,'') AND e.specialization <=> NULLIF(o.specialisation2,''));

INSERT INTO `demo_newmanomilan`.`profile_employment` (`id`, `profile_id`, `profession`, `working_field`, `organisation_name`, `designation`, `employment_city`, `employment_duration`, `monthly_income`, `annual_income`, `income_currency`, `original_monthly_income`, `original_annual_income`, `created_at`, `updated_at`)
SELECT o.id, o.id, NULLIF(o.profession,''), NULLIF(o.fieldOfWorking,''), NULLIF(o.organisationWorkingIn,''), NULLIF(o.designation,''), NULLIF(o.professionalCity,''), NULLIF(o.lengthOfEmployment,''), (CASE WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.monthlyIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') REGEXP '^[0-9]{1,13}([.][0-9]{1,2})?$' THEN CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.monthlyIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') AS DECIMAL(15,2)) END), (CASE WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.annualIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') REGEXP '^[0-9]{1,13}([.][0-9]{1,2})?$' THEN CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.annualIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') AS DECIMAL(15,2)) END), o.income_currency, o.original_monthly_income, o.original_annual_income, o.created_at, o.updated_at
FROM `demo_manomilan`.`profiles` o JOIN `demo_newmanomilan`.`profiles` n ON n.id=o.id
ON DUPLICATE KEY UPDATE
  `profession`=COALESCE(`profile_employment`.`profession`,VALUES(`profession`)),
  `working_field`=COALESCE(`profile_employment`.`working_field`,VALUES(`working_field`)),
  `organisation_name`=COALESCE(`profile_employment`.`organisation_name`,VALUES(`organisation_name`)),
  `designation`=COALESCE(`profile_employment`.`designation`,VALUES(`designation`)),
  `employment_city`=COALESCE(`profile_employment`.`employment_city`,VALUES(`employment_city`)),
  `employment_duration`=COALESCE(`profile_employment`.`employment_duration`,VALUES(`employment_duration`)),
  `monthly_income`=COALESCE(`profile_employment`.`monthly_income`,VALUES(`monthly_income`)),
  `annual_income`=COALESCE(`profile_employment`.`annual_income`,VALUES(`annual_income`)),
  `income_currency`=COALESCE(`profile_employment`.`income_currency`,VALUES(`income_currency`)),
  `original_monthly_income`=COALESCE(`profile_employment`.`original_monthly_income`,VALUES(`original_monthly_income`)),
  `original_annual_income`=COALESCE(`profile_employment`.`original_annual_income`,VALUES(`original_annual_income`));

INSERT INTO `demo_newmanomilan`.`profile_family_details` (`id`, `profile_id`, `father_name`, `father_status`, `father_native_place`, `father_occupation`, `father_contact`, `mother_name`, `mother_status`, `mother_native_place`, `mother_occupation`, `mother_contact`, `brothers_count`, `married_brothers_count`, `sisters_count`, `married_sisters_count`, `parents_intercaste_marriage`, `parents_different_caste_details`, `family_values`, `family_financial_status`, `family_annual_income`, `created_at`, `updated_at`)
SELECT o.id, o.id, NULLIF(o.fathersName,''), (CASE o.fatherAlive WHEN 'Yes' THEN 'Alive' WHEN 'No' THEN 'Deceased' END), NULLIF(o.fathersNativePlace,''), NULLIF(o.fathersOccupation,''), NULLIF(o.fatherContactNumber,''), NULLIF(o.mothersName,''), (CASE o.motherAlive WHEN 'Yes' THEN 'Alive' WHEN 'No' THEN 'Deceased' END), NULLIF(o.mothersNativePlace,''), NULLIF(o.mothersOccupation,''), NULLIF(o.motherContactNumber,''), o.noOfBrothers, o.brothersMarried, o.noOfSisters, o.sistersMarried, (CASE o.parentsIntercasteMarriage WHEN 'Yes' THEN 1 WHEN 'No' THEN 0 END), NULLIF(o.parentsDifferentCaste,''), NULLIF(o.familyValues,''), NULLIF(o.familyFinancialStatus,''), (CASE WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.familyAnnualIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') REGEXP '^[0-9]{1,13}([.][0-9]{1,2})?$' THEN CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.familyAnnualIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') AS DECIMAL(15,2)) END), o.created_at, o.updated_at
FROM `demo_manomilan`.`profiles` o JOIN `demo_newmanomilan`.`profiles` n ON n.id=o.id
ON DUPLICATE KEY UPDATE
  `father_name`=COALESCE(`profile_family_details`.`father_name`,VALUES(`father_name`)),
  `father_status`=COALESCE(`profile_family_details`.`father_status`,VALUES(`father_status`)),
  `father_native_place`=COALESCE(`profile_family_details`.`father_native_place`,VALUES(`father_native_place`)),
  `father_occupation`=COALESCE(`profile_family_details`.`father_occupation`,VALUES(`father_occupation`)),
  `father_contact`=COALESCE(`profile_family_details`.`father_contact`,VALUES(`father_contact`)),
  `mother_name`=COALESCE(`profile_family_details`.`mother_name`,VALUES(`mother_name`)),
  `mother_status`=COALESCE(`profile_family_details`.`mother_status`,VALUES(`mother_status`)),
  `mother_native_place`=COALESCE(`profile_family_details`.`mother_native_place`,VALUES(`mother_native_place`)),
  `mother_occupation`=COALESCE(`profile_family_details`.`mother_occupation`,VALUES(`mother_occupation`)),
  `mother_contact`=COALESCE(`profile_family_details`.`mother_contact`,VALUES(`mother_contact`)),
  `brothers_count`=COALESCE(`profile_family_details`.`brothers_count`,VALUES(`brothers_count`)),
  `married_brothers_count`=COALESCE(`profile_family_details`.`married_brothers_count`,VALUES(`married_brothers_count`)),
  `sisters_count`=COALESCE(`profile_family_details`.`sisters_count`,VALUES(`sisters_count`)),
  `married_sisters_count`=COALESCE(`profile_family_details`.`married_sisters_count`,VALUES(`married_sisters_count`)),
  `parents_intercaste_marriage`=COALESCE(`profile_family_details`.`parents_intercaste_marriage`,VALUES(`parents_intercaste_marriage`)),
  `parents_different_caste_details`=COALESCE(`profile_family_details`.`parents_different_caste_details`,VALUES(`parents_different_caste_details`)),
  `family_values`=COALESCE(`profile_family_details`.`family_values`,VALUES(`family_values`)),
  `family_financial_status`=COALESCE(`profile_family_details`.`family_financial_status`,VALUES(`family_financial_status`)),
  `family_annual_income`=COALESCE(`profile_family_details`.`family_annual_income`,VALUES(`family_annual_income`));

INSERT INTO `demo_newmanomilan`.`profile_religion_details` (`id`, `profile_id`, `religion`, `caste`, `sub_caste`, `rashi`, `nakshatra`, `charan`, `nadi`, `gan`, `gotra`, `created_at`, `updated_at`)
SELECT o.id, o.id, NULLIF(o.religion,''), NULLIF(o.caste,''), NULLIF(o.subCaste,''), NULLIF(o.rashi,''), NULLIF(o.nakshatra,''), NULLIF(o.charan,''), NULLIF(o.nadi,''), NULLIF(o.gan,''), NULLIF(o.gotra,''), o.created_at, o.updated_at
FROM `demo_manomilan`.`profiles` o JOIN `demo_newmanomilan`.`profiles` n ON n.id=o.id
ON DUPLICATE KEY UPDATE
  `religion`=COALESCE(`profile_religion_details`.`religion`,VALUES(`religion`)),
  `caste`=COALESCE(`profile_religion_details`.`caste`,VALUES(`caste`)),
  `sub_caste`=COALESCE(`profile_religion_details`.`sub_caste`,VALUES(`sub_caste`)),
  `rashi`=COALESCE(`profile_religion_details`.`rashi`,VALUES(`rashi`)),
  `nakshatra`=COALESCE(`profile_religion_details`.`nakshatra`,VALUES(`nakshatra`)),
  `charan`=COALESCE(`profile_religion_details`.`charan`,VALUES(`charan`)),
  `nadi`=COALESCE(`profile_religion_details`.`nadi`,VALUES(`nadi`)),
  `gan`=COALESCE(`profile_religion_details`.`gan`,VALUES(`gan`)),
  `gotra`=COALESCE(`profile_religion_details`.`gotra`,VALUES(`gotra`));

INSERT INTO `demo_newmanomilan`.`profile_documents` (`id`, `profile_id`, `birth_certificate`, `address_proof`, `education_certificate`, `profession_proof`, `income_proof`, `caste_certificate`, `medical_fitness_certificate`, `created_at`, `updated_at`)
SELECT o.id, o.id, NULLIF(o.birthDateProof,''), NULLIF(o.addressProof,''), NULLIF(o.educationProof,''), NULLIF(o.professionProof,''), NULLIF(o.incomeProof,''), NULLIF(o.casteCertificate,''), NULLIF(o.medicalFitnessCertificate,''), o.created_at, o.updated_at
FROM `demo_manomilan`.`profiles` o JOIN `demo_newmanomilan`.`profiles` n ON n.id=o.id
ON DUPLICATE KEY UPDATE
  `birth_certificate`=COALESCE(`profile_documents`.`birth_certificate`,VALUES(`birth_certificate`)),
  `address_proof`=COALESCE(`profile_documents`.`address_proof`,VALUES(`address_proof`)),
  `education_certificate`=COALESCE(`profile_documents`.`education_certificate`,VALUES(`education_certificate`)),
  `profession_proof`=COALESCE(`profile_documents`.`profession_proof`,VALUES(`profession_proof`)),
  `income_proof`=COALESCE(`profile_documents`.`income_proof`,VALUES(`income_proof`)),
  `caste_certificate`=COALESCE(`profile_documents`.`caste_certificate`,VALUES(`caste_certificate`)),
  `medical_fitness_certificate`=COALESCE(`profile_documents`.`medical_fitness_certificate`,VALUES(`medical_fitness_certificate`));

-- partner preferences (old preferences -> profile via old users.profile_id)
INSERT INTO `demo_newmanomilan`.`profile_partner_preferences` (id, profile_id, `preferred_religion`, `age_from`, `age_to`, `height_from`, `height_to`, `preferred_education`, `preferred_working_field`, `working_partner`, `expected_income`, `family_type`, `financial_background`, `family_values`, `preferred_caste`, `preferred_sub_caste`, `preferred_location`, `preferred_country`, `preferred_state`, `preferred_city`, `other_expectations`, created_at, updated_at)
SELECT p.id, u.profile_id, p.`preferred_religion`, p.`age_from`, p.`age_to`, p.`height_from`, p.`height_to`, p.`preferred_education`, p.`preferred_working_field`, p.`working_partner`, p.`expected_income`, p.`family_type`, p.`financial_background`, p.`family_values`, p.`preferred_caste`, p.`preferred_sub_caste`, p.`preferred_location`, p.`preferred_country`, p.`preferred_state`, p.`preferred_city`, p.`other_expectations`, p.created_at, p.updated_at
FROM `demo_manomilan`.`preferences` p JOIN `demo_manomilan`.`users` u ON u.id=p.user_id JOIN `demo_newmanomilan`.`profiles` n ON n.id=u.profile_id
ON DUPLICATE KEY UPDATE `preferred_religion`=COALESCE(`profile_partner_preferences`.`preferred_religion`,VALUES(`preferred_religion`)), `age_from`=COALESCE(`profile_partner_preferences`.`age_from`,VALUES(`age_from`)), `age_to`=COALESCE(`profile_partner_preferences`.`age_to`,VALUES(`age_to`)), `height_from`=COALESCE(`profile_partner_preferences`.`height_from`,VALUES(`height_from`)), `height_to`=COALESCE(`profile_partner_preferences`.`height_to`,VALUES(`height_to`)), `preferred_education`=COALESCE(`profile_partner_preferences`.`preferred_education`,VALUES(`preferred_education`)), `preferred_working_field`=COALESCE(`profile_partner_preferences`.`preferred_working_field`,VALUES(`preferred_working_field`)), `working_partner`=COALESCE(`profile_partner_preferences`.`working_partner`,VALUES(`working_partner`)), `expected_income`=COALESCE(`profile_partner_preferences`.`expected_income`,VALUES(`expected_income`)), `family_type`=COALESCE(`profile_partner_preferences`.`family_type`,VALUES(`family_type`)), `financial_background`=COALESCE(`profile_partner_preferences`.`financial_background`,VALUES(`financial_background`)), `family_values`=COALESCE(`profile_partner_preferences`.`family_values`,VALUES(`family_values`)), `preferred_caste`=COALESCE(`profile_partner_preferences`.`preferred_caste`,VALUES(`preferred_caste`)), `preferred_sub_caste`=COALESCE(`profile_partner_preferences`.`preferred_sub_caste`,VALUES(`preferred_sub_caste`)), `preferred_location`=COALESCE(`profile_partner_preferences`.`preferred_location`,VALUES(`preferred_location`)), `preferred_country`=COALESCE(`profile_partner_preferences`.`preferred_country`,VALUES(`preferred_country`)), `preferred_state`=COALESCE(`profile_partner_preferences`.`preferred_state`,VALUES(`preferred_state`)), `preferred_city`=COALESCE(`profile_partner_preferences`.`preferred_city`,VALUES(`preferred_city`)), `other_expectations`=COALESCE(`profile_partner_preferences`.`other_expectations`,VALUES(`other_expectations`));


-- ===== 4. MELAVA REGISTRATIONS (old melava_registrations -> profile_melava_registrations)
--  New table needs a campaign: one campaign is created per old melava_batch value (e.g. october_2026) if missing.
INSERT INTO `demo_newmanomilan`.`melava_campaigns` (melava_code, title, status, created_at, updated_at)
SELECT b.melava_batch, b.melava_batch, 'active', NOW(), NOW()
FROM (
  SELECT DISTINCT CONVERT(melava_batch USING utf8mb4) COLLATE utf8mb4_unicode_ci AS melava_batch
  FROM `demo_manomilan`.`melava_registrations`
  WHERE melava_batch IS NOT NULL AND melava_batch <> ''
) b
WHERE NOT EXISTS (
  SELECT 1 FROM `demo_newmanomilan`.`melava_campaigns` c
  WHERE CONVERT(c.melava_code USING utf8mb4) COLLATE utf8mb4_unicode_ci = b.melava_batch
);

-- repair rows the earlier run saved with campaign 0
UPDATE IGNORE `demo_newmanomilan`.`profile_melava_registrations` m
JOIN `demo_manomilan`.`melava_registrations` o ON o.id=m.id AND o.profile_id=m.profile_id
JOIN `demo_newmanomilan`.`melava_campaigns` c ON CONVERT(c.melava_code USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(o.melava_batch USING utf8mb4) COLLATE utf8mb4_unicode_ci
SET m.melava_campaign_id=c.id WHERE m.melava_campaign_id=0;

INSERT IGNORE INTO `demo_newmanomilan`.`profile_melava_registrations`
 (id, profile_id, melava_campaign_id, is_booklet_req, payment_screenshot, payment_verified, created_at, updated_at, booklet_payment_screenshot, booklet_payment_verified)
SELECT o.id, o.profile_id, c.id, o.is_booklet_req, o.payment_screenshot, o.payment_verified, o.created_at, o.updated_at, o.booklet_payment_screenshot, o.booklet_payment_verified
FROM `demo_manomilan`.`melava_registrations` o JOIN `demo_newmanomilan`.`melava_campaigns` c ON CONVERT(c.melava_code USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(o.melava_batch USING utf8mb4) COLLATE utf8mb4_unicode_ci
WHERE o.profile_id IN (SELECT id FROM `demo_newmanomilan`.`profiles`);


-- Photos are included in the profile INSERT above; no photo staging tables or per-profile photo updates are used.


SET FOREIGN_KEY_CHECKS = 1;

-- ===== 5. CHECKS (read-only): old rows vs new rows
SELECT 'profiles' t,(SELECT COUNT(*) FROM `demo_manomilan`.profiles) old_rows,(SELECT COUNT(*) FROM `demo_newmanomilan`.profiles) new_rows
UNION ALL SELECT 'users',(SELECT COUNT(*) FROM `demo_manomilan`.users),(SELECT COUNT(*) FROM `demo_newmanomilan`.users)
UNION ALL SELECT 'preferences',(SELECT COUNT(*) FROM `demo_manomilan`.preferences),(SELECT COUNT(*) FROM `demo_newmanomilan`.preferences)
UNION ALL SELECT 'payments',(SELECT COUNT(*) FROM `demo_manomilan`.payments),(SELECT COUNT(*) FROM `demo_newmanomilan`.payments)
UNION ALL SELECT 'payment_screenshots',(SELECT COUNT(*) FROM `demo_manomilan`.payment_screenshots),(SELECT COUNT(*) FROM `demo_newmanomilan`.payment_screenshots)
UNION ALL SELECT 'document_verifications',(SELECT COUNT(*) FROM `demo_manomilan`.document_verifications),(SELECT COUNT(*) FROM `demo_newmanomilan`.document_verifications)
UNION ALL SELECT 'profile_visitors',(SELECT COUNT(*) FROM `demo_manomilan`.profile_visitors),(SELECT COUNT(*) FROM `demo_newmanomilan`.profile_visitors)
UNION ALL SELECT 'user_interests',(SELECT COUNT(*) FROM `demo_manomilan`.user_interests),(SELECT COUNT(*) FROM `demo_newmanomilan`.user_interests)
UNION ALL SELECT 'profile_education (>= profiles)',(SELECT COUNT(*) FROM `demo_manomilan`.profiles),(SELECT COUNT(*) FROM `demo_newmanomilan`.profile_education)
UNION ALL SELECT 'profile_melava_registrations',(SELECT COUNT(*) FROM `demo_manomilan`.melava_registrations WHERE profile_id IS NOT NULL),(SELECT COUNT(*) FROM `demo_newmanomilan`.profile_melava_registrations);

-- photo status per column (how many profiles have each photo column filled)
SELECT COUNT(*) profiles, SUM(profile_photo IS NOT NULL) profile_photo, SUM(selfie_photo IS NOT NULL) selfie_photo,
 SUM(full_body_photo IS NOT NULL) full_body_photo, SUM(half_body_photo IS NOT NULL) half_body_photo, SUM(additional_photos IS NOT NULL) still_in_additional_json FROM `demo_newmanomilan`.profiles;

-- old profiles that have a melava photo but whose new profile has none of it
SELECT m.profile_id, m.candidate_photos FROM `demo_manomilan`.melava_registrations m JOIN `demo_newmanomilan`.profiles p ON p.id=m.profile_id
WHERE m.candidate_photos IS NOT NULL AND m.candidate_photos NOT IN ('','null','[]') AND p.candidate_photos IS NULL;

-- old users NOT copied because of duplicate username
SELECT id,name,username,email FROM `demo_manomilan`.users WHERE id NOT IN (SELECT id FROM `demo_newmanomilan`.users);