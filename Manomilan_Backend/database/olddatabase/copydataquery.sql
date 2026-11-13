-- =====================================================================
--  copydataquery.sql  (MariaDB)  OLD `demo_manomilan`  ->  NEW `demo_newmanomilan`
--  Run on the server hosting both databases, after backing up both. Review errors and row-count checks.
--  * Existing rows with the same primary key are refreshed from the old DB; conflicting different-key rows are skipped.
--  * Profiles, addresses, photos, documents, and related rows are refreshed as well as inserted when missing.
--  * Source values overwrite mapped fields on matching rows; back up the destination before running this sync.
--  * Photos: each photo goes into its own column: profile_photo -> selfie_photo -> full_body_photo -> half_body_photo.
--    Pool order: old profilePhoto, old additional_photos, melava_registrations.candidate_photos, melava pending photos.
--    Only photos beyond 4 stay in additional_photos (JSON) so nothing is lost.
--  * No helper, temporary, or legacy tables are created; unmapped columns remain only in the old database.
--  BACK UP BOTH demo_manomilan AND demo_newmanomilan FIRST. This script has not been run against your live DB.
-- =====================================================================
SET SESSION sql_mode = 'NO_AUTO_VALUE_ON_ZERO';
SET SESSION group_concat_max_len = 10000000;
SET FOREIGN_KEY_CHECKS = 0;

-- ===== 1. SAME-NAME TABLES (same-id rows refreshed; unrelated unique-key conflicts are not overwritten)
INSERT IGNORE INTO `demo_newmanomilan`.`roles` (`id`, `name`, `user_type`, `created_at`, `updated_at`)
SELECT o.`id`, o.`name`, o.`user_type`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`roles` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `name`=IF(`roles`.`id`=VALUES(`id`),VALUES(`name`),`roles`.`name`),
  `user_type`=IF(`roles`.`id`=VALUES(`id`),VALUES(`user_type`),`roles`.`user_type`),
  `created_at`=IF(`roles`.`id`=VALUES(`id`),VALUES(`created_at`),`roles`.`created_at`),
  `updated_at`=IF(`roles`.`id`=VALUES(`id`),VALUES(`updated_at`),`roles`.`updated_at`);

INSERT IGNORE INTO `demo_newmanomilan`.`applications` (`id`, `app_code`, `app_name`, `description`, `current_version`, `base_url`, `api_key`, `status`, `created_at`, `updated_at`)
SELECT o.`id`, o.`app_code`, o.`app_name`, o.`description`, o.`current_version`, o.`base_url`, o.`api_key`, o.`status`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`applications` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `app_code`=IF(`applications`.`id`=VALUES(`id`),VALUES(`app_code`),`applications`.`app_code`),
  `app_name`=IF(`applications`.`id`=VALUES(`id`),VALUES(`app_name`),`applications`.`app_name`),
  `description`=IF(`applications`.`id`=VALUES(`id`),VALUES(`description`),`applications`.`description`),
  `current_version`=IF(`applications`.`id`=VALUES(`id`),VALUES(`current_version`),`applications`.`current_version`),
  `base_url`=IF(`applications`.`id`=VALUES(`id`),VALUES(`base_url`),`applications`.`base_url`),
  `api_key`=IF(`applications`.`id`=VALUES(`id`),VALUES(`api_key`),`applications`.`api_key`),
  `status`=IF(`applications`.`id`=VALUES(`id`),VALUES(`status`),`applications`.`status`),
  `created_at`=IF(`applications`.`id`=VALUES(`id`),VALUES(`created_at`),`applications`.`created_at`),
  `updated_at`=IF(`applications`.`id`=VALUES(`id`),VALUES(`updated_at`),`applications`.`updated_at`);

INSERT IGNORE INTO `demo_newmanomilan`.`modules` (`id`, `application_id`, `module_name`, `description`, `status`, `created_at`, `updated_at`)
SELECT o.`id`, o.`application_id`, o.`module_name`, o.`description`, o.`status`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`modules` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `application_id`=IF(`modules`.`id`=VALUES(`id`),VALUES(`application_id`),`modules`.`application_id`),
  `module_name`=IF(`modules`.`id`=VALUES(`id`),VALUES(`module_name`),`modules`.`module_name`),
  `description`=IF(`modules`.`id`=VALUES(`id`),VALUES(`description`),`modules`.`description`),
  `status`=IF(`modules`.`id`=VALUES(`id`),VALUES(`status`),`modules`.`status`),
  `created_at`=IF(`modules`.`id`=VALUES(`id`),VALUES(`created_at`),`modules`.`created_at`),
  `updated_at`=IF(`modules`.`id`=VALUES(`id`),VALUES(`updated_at`),`modules`.`updated_at`);

INSERT IGNORE INTO `demo_newmanomilan`.`users` (`id`, `profile_id`, `name`, `email`, `email_verified_at`, `username`, `password`, `status`, `is_password_changed`, `user_type`, `role_id`, `remember_token`, `created_at`, `updated_at`)
SELECT o.`id`, o.`profile_id`, o.`name`, o.`email`, o.`email_verified_at`, o.`username`, o.`password`, o.`status`, o.`is_password_changed`, o.`user_type`, o.`role_id`, o.`remember_token`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`users` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `profile_id`=IF(`users`.`id`=VALUES(`id`),VALUES(`profile_id`),`users`.`profile_id`),
  `name`=IF(`users`.`id`=VALUES(`id`),VALUES(`name`),`users`.`name`),
  `email`=IF(`users`.`id`=VALUES(`id`),VALUES(`email`),`users`.`email`),
  `email_verified_at`=IF(`users`.`id`=VALUES(`id`),VALUES(`email_verified_at`),`users`.`email_verified_at`),
  `username`=IF(`users`.`id`=VALUES(`id`),VALUES(`username`),`users`.`username`),
  `password`=IF(`users`.`id`=VALUES(`id`),VALUES(`password`),`users`.`password`),
  `status`=IF(`users`.`id`=VALUES(`id`),VALUES(`status`),`users`.`status`),
  `is_password_changed`=IF(`users`.`id`=VALUES(`id`),VALUES(`is_password_changed`),`users`.`is_password_changed`),
  `user_type`=IF(`users`.`id`=VALUES(`id`),VALUES(`user_type`),`users`.`user_type`),
  `role_id`=IF(`users`.`id`=VALUES(`id`),VALUES(`role_id`),`users`.`role_id`),
  `remember_token`=IF(`users`.`id`=VALUES(`id`),VALUES(`remember_token`),`users`.`remember_token`),
  `created_at`=IF(`users`.`id`=VALUES(`id`),VALUES(`created_at`),`users`.`created_at`),
  `updated_at`=IF(`users`.`id`=VALUES(`id`),VALUES(`updated_at`),`users`.`updated_at`);

-- Duplicate usernames are skipped here; review the final query to identify those users.
INSERT IGNORE INTO `demo_newmanomilan`.`melava_pending_registrations` (`id`, `token`, `mobile`, `is_existing_website_user`, `user_id`, `profile_id`, `registration_data`, `status`, `expires_at`, `created_at`, `updated_at`)
SELECT o.`id`, o.`token`, o.`mobile`, o.`is_existing_website_user`, o.`user_id`, o.`profile_id`, o.`registration_data`, o.`status`, o.`expires_at`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`melava_pending_registrations` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `token`=IF(`melava_pending_registrations`.`id`=VALUES(`id`),VALUES(`token`),`melava_pending_registrations`.`token`),
  `mobile`=IF(`melava_pending_registrations`.`id`=VALUES(`id`),VALUES(`mobile`),`melava_pending_registrations`.`mobile`),
  `is_existing_website_user`=IF(`melava_pending_registrations`.`id`=VALUES(`id`),VALUES(`is_existing_website_user`),`melava_pending_registrations`.`is_existing_website_user`),
  `user_id`=IF(`melava_pending_registrations`.`id`=VALUES(`id`),VALUES(`user_id`),`melava_pending_registrations`.`user_id`),
  `profile_id`=IF(`melava_pending_registrations`.`id`=VALUES(`id`),VALUES(`profile_id`),`melava_pending_registrations`.`profile_id`),
  `registration_data`=IF(`melava_pending_registrations`.`id`=VALUES(`id`),VALUES(`registration_data`),`melava_pending_registrations`.`registration_data`),
  `status`=IF(`melava_pending_registrations`.`id`=VALUES(`id`),VALUES(`status`),`melava_pending_registrations`.`status`),
  `expires_at`=IF(`melava_pending_registrations`.`id`=VALUES(`id`),VALUES(`expires_at`),`melava_pending_registrations`.`expires_at`),
  `created_at`=IF(`melava_pending_registrations`.`id`=VALUES(`id`),VALUES(`created_at`),`melava_pending_registrations`.`created_at`),
  `updated_at`=IF(`melava_pending_registrations`.`id`=VALUES(`id`),VALUES(`updated_at`),`melava_pending_registrations`.`updated_at`);

INSERT IGNORE INTO `demo_newmanomilan`.`document_verifications` (`id`, `profile_id`, `identificationProof_status`, `birthDateProof_status`, `addressProof_status`, `educationProof_status`, `professionProof_status`, `incomeProof_status`, `casteCertificate_status`, `medicalFitnessCertificate_status`, `selfieVerification_status`, `identificationProof_remarks`, `birthDateProof_remarks`, `addressProof_remarks`, `educationProof_remarks`, `professionProof_remarks`, `incomeProof_remarks`, `casteCertificate_remarks`, `medicalFitnessCertificate_remarks`, `selfieVerification_remarks`, `created_at`, `updated_at`)
SELECT o.`id`, o.`profile_id`, o.`identificationProof_status`, o.`birthDateProof_status`, o.`addressProof_status`, o.`educationProof_status`, o.`professionProof_status`, o.`incomeProof_status`, o.`casteCertificate_status`, o.`medicalFitnessCertificate_status`, o.`selfieVerification_status`, o.`identificationProof_remarks`, o.`birthDateProof_remarks`, o.`addressProof_remarks`, o.`educationProof_remarks`, o.`professionProof_remarks`, o.`incomeProof_remarks`, o.`casteCertificate_remarks`, o.`medicalFitnessCertificate_remarks`, o.`selfieVerification_remarks`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`document_verifications` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `profile_id`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`profile_id`),`document_verifications`.`profile_id`),
  `identificationProof_status`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`identificationProof_status`),`document_verifications`.`identificationProof_status`),
  `birthDateProof_status`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`birthDateProof_status`),`document_verifications`.`birthDateProof_status`),
  `addressProof_status`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`addressProof_status`),`document_verifications`.`addressProof_status`),
  `educationProof_status`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`educationProof_status`),`document_verifications`.`educationProof_status`),
  `professionProof_status`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`professionProof_status`),`document_verifications`.`professionProof_status`),
  `incomeProof_status`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`incomeProof_status`),`document_verifications`.`incomeProof_status`),
  `casteCertificate_status`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`casteCertificate_status`),`document_verifications`.`casteCertificate_status`),
  `medicalFitnessCertificate_status`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`medicalFitnessCertificate_status`),`document_verifications`.`medicalFitnessCertificate_status`),
  `selfieVerification_status`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`selfieVerification_status`),`document_verifications`.`selfieVerification_status`),
  `identificationProof_remarks`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`identificationProof_remarks`),`document_verifications`.`identificationProof_remarks`),
  `birthDateProof_remarks`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`birthDateProof_remarks`),`document_verifications`.`birthDateProof_remarks`),
  `addressProof_remarks`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`addressProof_remarks`),`document_verifications`.`addressProof_remarks`),
  `educationProof_remarks`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`educationProof_remarks`),`document_verifications`.`educationProof_remarks`),
  `professionProof_remarks`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`professionProof_remarks`),`document_verifications`.`professionProof_remarks`),
  `incomeProof_remarks`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`incomeProof_remarks`),`document_verifications`.`incomeProof_remarks`),
  `casteCertificate_remarks`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`casteCertificate_remarks`),`document_verifications`.`casteCertificate_remarks`),
  `medicalFitnessCertificate_remarks`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`medicalFitnessCertificate_remarks`),`document_verifications`.`medicalFitnessCertificate_remarks`),
  `selfieVerification_remarks`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`selfieVerification_remarks`),`document_verifications`.`selfieVerification_remarks`),
  `created_at`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`created_at`),`document_verifications`.`created_at`),
  `updated_at`=IF(`document_verifications`.`id`=VALUES(`id`),VALUES(`updated_at`),`document_verifications`.`updated_at`);

INSERT IGNORE INTO `demo_newmanomilan`.`enquiries` (`id`, `profilePhoto`, `melavaNo`, `name`, `address`, `city`, `taluka`, `dist`, `contactPersonName1`, `contactPersonMobile1`, `contactPersonName2`, `contactPersonMobile2`, `contactPersonName3`, `contactPersonMobile3`, `email`, `education`, `gender`, `DOB`, `time`, `place`, `height`, `potJat`, `parentName`, `job`, `monthlyIncome`, `expectation`, `extraInformation`, `location`, `mobileNo`, `status`, `created_at`, `updated_at`, `updated_by`)
SELECT o.`id`, o.`profilePhoto`, o.`melavaNo`, o.`name`, o.`address`, o.`city`, o.`taluka`, o.`dist`, o.`contactPersonName1`, o.`contactPersonMobile1`, o.`contactPersonName2`, o.`contactPersonMobile2`, o.`contactPersonName3`, o.`contactPersonMobile3`, o.`email`, o.`education`, o.`gender`, o.`DOB`, o.`time`, o.`place`, o.`height`, o.`potJat`, o.`parentName`, o.`job`, o.`monthlyIncome`, o.`expectation`, o.`extraInformation`, o.`location`, o.`mobileNo`, o.`status`, o.`created_at`, o.`updated_at`, o.`updated_by` FROM `demo_manomilan`.`enquiries` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `profilePhoto`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`profilePhoto`),`enquiries`.`profilePhoto`),
  `melavaNo`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`melavaNo`),`enquiries`.`melavaNo`),
  `name`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`name`),`enquiries`.`name`),
  `address`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`address`),`enquiries`.`address`),
  `city`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`city`),`enquiries`.`city`),
  `taluka`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`taluka`),`enquiries`.`taluka`),
  `dist`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`dist`),`enquiries`.`dist`),
  `contactPersonName1`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`contactPersonName1`),`enquiries`.`contactPersonName1`),
  `contactPersonMobile1`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`contactPersonMobile1`),`enquiries`.`contactPersonMobile1`),
  `contactPersonName2`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`contactPersonName2`),`enquiries`.`contactPersonName2`),
  `contactPersonMobile2`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`contactPersonMobile2`),`enquiries`.`contactPersonMobile2`),
  `contactPersonName3`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`contactPersonName3`),`enquiries`.`contactPersonName3`),
  `contactPersonMobile3`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`contactPersonMobile3`),`enquiries`.`contactPersonMobile3`),
  `email`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`email`),`enquiries`.`email`),
  `education`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`education`),`enquiries`.`education`),
  `gender`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`gender`),`enquiries`.`gender`),
  `DOB`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`DOB`),`enquiries`.`DOB`),
  `time`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`time`),`enquiries`.`time`),
  `place`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`place`),`enquiries`.`place`),
  `height`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`height`),`enquiries`.`height`),
  `potJat`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`potJat`),`enquiries`.`potJat`),
  `parentName`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`parentName`),`enquiries`.`parentName`),
  `job`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`job`),`enquiries`.`job`),
  `monthlyIncome`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`monthlyIncome`),`enquiries`.`monthlyIncome`),
  `expectation`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`expectation`),`enquiries`.`expectation`),
  `extraInformation`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`extraInformation`),`enquiries`.`extraInformation`),
  `location`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`location`),`enquiries`.`location`),
  `mobileNo`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`mobileNo`),`enquiries`.`mobileNo`),
  `status`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`status`),`enquiries`.`status`),
  `created_at`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`created_at`),`enquiries`.`created_at`),
  `updated_at`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`updated_at`),`enquiries`.`updated_at`),
  `updated_by`=IF(`enquiries`.`id`=VALUES(`id`),VALUES(`updated_by`),`enquiries`.`updated_by`);

INSERT IGNORE INTO `demo_newmanomilan`.`failed_jobs` (`id`, `connection`, `queue`, `payload`, `exception`, `failed_at`)
SELECT o.`id`, o.`connection`, o.`queue`, o.`payload`, o.`exception`, o.`failed_at` FROM `demo_manomilan`.`failed_jobs` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `connection`=IF(`failed_jobs`.`id`=VALUES(`id`),VALUES(`connection`),`failed_jobs`.`connection`),
  `queue`=IF(`failed_jobs`.`id`=VALUES(`id`),VALUES(`queue`),`failed_jobs`.`queue`),
  `payload`=IF(`failed_jobs`.`id`=VALUES(`id`),VALUES(`payload`),`failed_jobs`.`payload`),
  `exception`=IF(`failed_jobs`.`id`=VALUES(`id`),VALUES(`exception`),`failed_jobs`.`exception`),
  `failed_at`=IF(`failed_jobs`.`id`=VALUES(`id`),VALUES(`failed_at`),`failed_jobs`.`failed_at`);

INSERT IGNORE INTO `demo_newmanomilan`.`meetings` (`id`, `candidate_id`, `place`, `date`, `time_slot`, `spoke_to_matched_parents`, `spoke_to_candidate`, `other_candidate_id`, `day`, `spoke_to_matched_profile`, `spoke_to_cand_parents`, `remark`, `created_at`, `updated_at`)
SELECT o.`id`, o.`candidate_id`, o.`place`, o.`date`, o.`time_slot`, o.`spoke_to_matched_parents`, o.`spoke_to_candidate`, o.`other_candidate_id`, o.`day`, o.`spoke_to_matched_profile`, o.`spoke_to_cand_parents`, o.`remark`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`meetings` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `candidate_id`=IF(`meetings`.`id`=VALUES(`id`),VALUES(`candidate_id`),`meetings`.`candidate_id`),
  `place`=IF(`meetings`.`id`=VALUES(`id`),VALUES(`place`),`meetings`.`place`),
  `date`=IF(`meetings`.`id`=VALUES(`id`),VALUES(`date`),`meetings`.`date`),
  `time_slot`=IF(`meetings`.`id`=VALUES(`id`),VALUES(`time_slot`),`meetings`.`time_slot`),
  `spoke_to_matched_parents`=IF(`meetings`.`id`=VALUES(`id`),VALUES(`spoke_to_matched_parents`),`meetings`.`spoke_to_matched_parents`),
  `spoke_to_candidate`=IF(`meetings`.`id`=VALUES(`id`),VALUES(`spoke_to_candidate`),`meetings`.`spoke_to_candidate`),
  `other_candidate_id`=IF(`meetings`.`id`=VALUES(`id`),VALUES(`other_candidate_id`),`meetings`.`other_candidate_id`),
  `day`=IF(`meetings`.`id`=VALUES(`id`),VALUES(`day`),`meetings`.`day`),
  `spoke_to_matched_profile`=IF(`meetings`.`id`=VALUES(`id`),VALUES(`spoke_to_matched_profile`),`meetings`.`spoke_to_matched_profile`),
  `spoke_to_cand_parents`=IF(`meetings`.`id`=VALUES(`id`),VALUES(`spoke_to_cand_parents`),`meetings`.`spoke_to_cand_parents`),
  `remark`=IF(`meetings`.`id`=VALUES(`id`),VALUES(`remark`),`meetings`.`remark`),
  `created_at`=IF(`meetings`.`id`=VALUES(`id`),VALUES(`created_at`),`meetings`.`created_at`),
  `updated_at`=IF(`meetings`.`id`=VALUES(`id`),VALUES(`updated_at`),`meetings`.`updated_at`);

INSERT IGNORE INTO `demo_newmanomilan`.`password_resets` (`email`, `token`, `created_at`)
SELECT o.`email`, o.`token`, o.`created_at` FROM `demo_manomilan`.`password_resets` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `token`=VALUES(`token`),
  `created_at`=VALUES(`created_at`);

INSERT IGNORE INTO `demo_newmanomilan`.`payments` (`id`, `user_id`, `photo_upload`, `created_at`, `updated_at`, `updated_by`)
SELECT o.`id`, o.`user_id`, o.`photo_upload`, o.`created_at`, o.`updated_at`, o.`updated_by` FROM `demo_manomilan`.`payments` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `user_id`=IF(`payments`.`id`=VALUES(`id`),VALUES(`user_id`),`payments`.`user_id`),
  `photo_upload`=IF(`payments`.`id`=VALUES(`id`),VALUES(`photo_upload`),`payments`.`photo_upload`),
  `created_at`=IF(`payments`.`id`=VALUES(`id`),VALUES(`created_at`),`payments`.`created_at`),
  `updated_at`=IF(`payments`.`id`=VALUES(`id`),VALUES(`updated_at`),`payments`.`updated_at`),
  `updated_by`=IF(`payments`.`id`=VALUES(`id`),VALUES(`updated_by`),`payments`.`updated_by`);

INSERT IGNORE INTO `demo_newmanomilan`.`payment_screenshots` (`id`, `profile_id`, `screenshot_path`, `payment_verified`, `created_at`, `updated_at`)
SELECT o.`id`, o.`profile_id`, o.`screenshot_path`, o.`payment_verified`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`payment_screenshots` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `profile_id`=IF(`payment_screenshots`.`id`=VALUES(`id`),VALUES(`profile_id`),`payment_screenshots`.`profile_id`),
  `screenshot_path`=IF(`payment_screenshots`.`id`=VALUES(`id`),VALUES(`screenshot_path`),`payment_screenshots`.`screenshot_path`),
  `payment_verified`=IF(`payment_screenshots`.`id`=VALUES(`id`),VALUES(`payment_verified`),`payment_screenshots`.`payment_verified`),
  `created_at`=IF(`payment_screenshots`.`id`=VALUES(`id`),VALUES(`created_at`),`payment_screenshots`.`created_at`),
  `updated_at`=IF(`payment_screenshots`.`id`=VALUES(`id`),VALUES(`updated_at`),`payment_screenshots`.`updated_at`);

INSERT IGNORE INTO `demo_newmanomilan`.`preferences` (`id`, `user_id`, `preferred_religion`, `preferred_caste`, `preferred_sub_caste`, `age_from`, `age_to`, `height_from`, `height_to`, `preferred_education`, `working_partner`, `preferred_working_field`, `expected_income`, `family_type`, `financial_background`, `family_values`, `preferred_body_type`, `preferred_location`, `preferred_country`, `preferred_state`, `preferred_city`, `other_expectations`, `created_at`, `updated_at`)
SELECT o.`id`, o.`user_id`, o.`preferred_religion`, o.`preferred_caste`, o.`preferred_sub_caste`, o.`age_from`, o.`age_to`, o.`height_from`, o.`height_to`, o.`preferred_education`, o.`working_partner`, o.`preferred_working_field`, o.`expected_income`, o.`family_type`, o.`financial_background`, o.`family_values`, o.`preferred_body_type`, o.`preferred_location`, o.`preferred_country`, o.`preferred_state`, o.`preferred_city`, o.`other_expectations`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`preferences` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `user_id`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`user_id`),`preferences`.`user_id`),
  `preferred_religion`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`preferred_religion`),`preferences`.`preferred_religion`),
  `preferred_caste`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`preferred_caste`),`preferences`.`preferred_caste`),
  `preferred_sub_caste`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`preferred_sub_caste`),`preferences`.`preferred_sub_caste`),
  `age_from`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`age_from`),`preferences`.`age_from`),
  `age_to`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`age_to`),`preferences`.`age_to`),
  `height_from`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`height_from`),`preferences`.`height_from`),
  `height_to`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`height_to`),`preferences`.`height_to`),
  `preferred_education`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`preferred_education`),`preferences`.`preferred_education`),
  `working_partner`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`working_partner`),`preferences`.`working_partner`),
  `preferred_working_field`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`preferred_working_field`),`preferences`.`preferred_working_field`),
  `expected_income`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`expected_income`),`preferences`.`expected_income`),
  `family_type`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`family_type`),`preferences`.`family_type`),
  `financial_background`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`financial_background`),`preferences`.`financial_background`),
  `family_values`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`family_values`),`preferences`.`family_values`),
  `preferred_body_type`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`preferred_body_type`),`preferences`.`preferred_body_type`),
  `preferred_location`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`preferred_location`),`preferences`.`preferred_location`),
  `preferred_country`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`preferred_country`),`preferences`.`preferred_country`),
  `preferred_state`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`preferred_state`),`preferences`.`preferred_state`),
  `preferred_city`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`preferred_city`),`preferences`.`preferred_city`),
  `other_expectations`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`other_expectations`),`preferences`.`other_expectations`),
  `created_at`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`created_at`),`preferences`.`created_at`),
  `updated_at`=IF(`preferences`.`id`=VALUES(`id`),VALUES(`updated_at`),`preferences`.`updated_at`);

INSERT IGNORE INTO `demo_newmanomilan`.`profile_visitors` (`id`, `profile_id`, `visitor_id`, `created_at`, `updated_at`)
SELECT o.`id`, o.`profile_id`, o.`visitor_id`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`profile_visitors` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `profile_id`=IF(`profile_visitors`.`id`=VALUES(`id`),VALUES(`profile_id`),`profile_visitors`.`profile_id`),
  `visitor_id`=IF(`profile_visitors`.`id`=VALUES(`id`),VALUES(`visitor_id`),`profile_visitors`.`visitor_id`),
  `created_at`=IF(`profile_visitors`.`id`=VALUES(`id`),VALUES(`created_at`),`profile_visitors`.`created_at`),
  `updated_at`=IF(`profile_visitors`.`id`=VALUES(`id`),VALUES(`updated_at`),`profile_visitors`.`updated_at`);

INSERT IGNORE INTO `demo_newmanomilan`.`success_stories` (`id`, `groom_name`, `bride_name`, `marriage_date`, `city`, `state`, `groom_photo`, `bride_photo`, `couple_photo`, `wedding_photo`, `story_title`, `short_description`, `full_story`, `family_message`, `rating`, `is_featured`, `display_order`, `status`, `created_by`, `created_at`, `updated_at`, `deleted_at`)
SELECT o.`id`, o.`groom_name`, o.`bride_name`, o.`marriage_date`, o.`city`, o.`state`, o.`groom_photo`, o.`bride_photo`, o.`couple_photo`, o.`wedding_photo`, o.`story_title`, o.`short_description`, o.`full_story`, o.`family_message`, o.`rating`, o.`is_featured`, o.`display_order`, o.`status`, o.`created_by`, o.`created_at`, o.`updated_at`, o.`deleted_at` FROM `demo_manomilan`.`success_stories` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `groom_name`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`groom_name`),`success_stories`.`groom_name`),
  `bride_name`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`bride_name`),`success_stories`.`bride_name`),
  `marriage_date`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`marriage_date`),`success_stories`.`marriage_date`),
  `city`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`city`),`success_stories`.`city`),
  `state`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`state`),`success_stories`.`state`),
  `groom_photo`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`groom_photo`),`success_stories`.`groom_photo`),
  `bride_photo`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`bride_photo`),`success_stories`.`bride_photo`),
  `couple_photo`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`couple_photo`),`success_stories`.`couple_photo`),
  `wedding_photo`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`wedding_photo`),`success_stories`.`wedding_photo`),
  `story_title`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`story_title`),`success_stories`.`story_title`),
  `short_description`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`short_description`),`success_stories`.`short_description`),
  `full_story`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`full_story`),`success_stories`.`full_story`),
  `family_message`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`family_message`),`success_stories`.`family_message`),
  `rating`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`rating`),`success_stories`.`rating`),
  `is_featured`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`is_featured`),`success_stories`.`is_featured`),
  `display_order`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`display_order`),`success_stories`.`display_order`),
  `status`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`status`),`success_stories`.`status`),
  `created_by`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`created_by`),`success_stories`.`created_by`),
  `created_at`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`created_at`),`success_stories`.`created_at`),
  `updated_at`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`updated_at`),`success_stories`.`updated_at`),
  `deleted_at`=IF(`success_stories`.`id`=VALUES(`id`),VALUES(`deleted_at`),`success_stories`.`deleted_at`);

INSERT IGNORE INTO `demo_newmanomilan`.`tickets` (`id`, `ticket_no`, `application_id`, `module_id`, `user_id`, `subject`, `description`, `category`, `ticket_status`, `attachment`, `status`, `created_at`, `updated_at`)
SELECT o.`id`, o.`ticket_no`, o.`application_id`, o.`module_id`, o.`user_id`, o.`subject`, o.`description`, o.`category`, o.`ticket_status`, o.`attachment`, o.`status`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`tickets` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `ticket_no`=IF(`tickets`.`id`=VALUES(`id`),VALUES(`ticket_no`),`tickets`.`ticket_no`),
  `application_id`=IF(`tickets`.`id`=VALUES(`id`),VALUES(`application_id`),`tickets`.`application_id`),
  `module_id`=IF(`tickets`.`id`=VALUES(`id`),VALUES(`module_id`),`tickets`.`module_id`),
  `user_id`=IF(`tickets`.`id`=VALUES(`id`),VALUES(`user_id`),`tickets`.`user_id`),
  `subject`=IF(`tickets`.`id`=VALUES(`id`),VALUES(`subject`),`tickets`.`subject`),
  `description`=IF(`tickets`.`id`=VALUES(`id`),VALUES(`description`),`tickets`.`description`),
  `category`=IF(`tickets`.`id`=VALUES(`id`),VALUES(`category`),`tickets`.`category`),
  `ticket_status`=IF(`tickets`.`id`=VALUES(`id`),VALUES(`ticket_status`),`tickets`.`ticket_status`),
  `attachment`=IF(`tickets`.`id`=VALUES(`id`),VALUES(`attachment`),`tickets`.`attachment`),
  `status`=IF(`tickets`.`id`=VALUES(`id`),VALUES(`status`),`tickets`.`status`),
  `created_at`=IF(`tickets`.`id`=VALUES(`id`),VALUES(`created_at`),`tickets`.`created_at`),
  `updated_at`=IF(`tickets`.`id`=VALUES(`id`),VALUES(`updated_at`),`tickets`.`updated_at`);

INSERT IGNORE INTO `demo_newmanomilan`.`ticket_items` (`id`, `ticket_id`, `attachment`, `title`, `description`, `item_type`, `priority`, `severity`, `ticket_status`, `status`, `created_at`, `updated_at`)
SELECT o.`id`, o.`ticket_id`, o.`attachment`, o.`title`, o.`description`, o.`item_type`, o.`priority`, o.`severity`, o.`ticket_status`, o.`status`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`ticket_items` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `ticket_id`=IF(`ticket_items`.`id`=VALUES(`id`),VALUES(`ticket_id`),`ticket_items`.`ticket_id`),
  `attachment`=IF(`ticket_items`.`id`=VALUES(`id`),VALUES(`attachment`),`ticket_items`.`attachment`),
  `title`=IF(`ticket_items`.`id`=VALUES(`id`),VALUES(`title`),`ticket_items`.`title`),
  `description`=IF(`ticket_items`.`id`=VALUES(`id`),VALUES(`description`),`ticket_items`.`description`),
  `item_type`=IF(`ticket_items`.`id`=VALUES(`id`),VALUES(`item_type`),`ticket_items`.`item_type`),
  `priority`=IF(`ticket_items`.`id`=VALUES(`id`),VALUES(`priority`),`ticket_items`.`priority`),
  `severity`=IF(`ticket_items`.`id`=VALUES(`id`),VALUES(`severity`),`ticket_items`.`severity`),
  `ticket_status`=IF(`ticket_items`.`id`=VALUES(`id`),VALUES(`ticket_status`),`ticket_items`.`ticket_status`),
  `status`=IF(`ticket_items`.`id`=VALUES(`id`),VALUES(`status`),`ticket_items`.`status`),
  `created_at`=IF(`ticket_items`.`id`=VALUES(`id`),VALUES(`created_at`),`ticket_items`.`created_at`),
  `updated_at`=IF(`ticket_items`.`id`=VALUES(`id`),VALUES(`updated_at`),`ticket_items`.`updated_at`);

INSERT IGNORE INTO `demo_newmanomilan`.`ticket_comments` (`id`, `ticket_id`, `ticket_item_id`, `comment_by`, `user_id`, `comment`, `attachment`, `is_internal`, `created_at`, `updated_at`)
SELECT o.`id`, o.`ticket_id`, o.`ticket_item_id`, o.`comment_by`, o.`user_id`, o.`comment`, o.`attachment`, o.`is_internal`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`ticket_comments` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `ticket_id`=IF(`ticket_comments`.`id`=VALUES(`id`),VALUES(`ticket_id`),`ticket_comments`.`ticket_id`),
  `ticket_item_id`=IF(`ticket_comments`.`id`=VALUES(`id`),VALUES(`ticket_item_id`),`ticket_comments`.`ticket_item_id`),
  `comment_by`=IF(`ticket_comments`.`id`=VALUES(`id`),VALUES(`comment_by`),`ticket_comments`.`comment_by`),
  `user_id`=IF(`ticket_comments`.`id`=VALUES(`id`),VALUES(`user_id`),`ticket_comments`.`user_id`),
  `comment`=IF(`ticket_comments`.`id`=VALUES(`id`),VALUES(`comment`),`ticket_comments`.`comment`),
  `attachment`=IF(`ticket_comments`.`id`=VALUES(`id`),VALUES(`attachment`),`ticket_comments`.`attachment`),
  `is_internal`=IF(`ticket_comments`.`id`=VALUES(`id`),VALUES(`is_internal`),`ticket_comments`.`is_internal`),
  `created_at`=IF(`ticket_comments`.`id`=VALUES(`id`),VALUES(`created_at`),`ticket_comments`.`created_at`),
  `updated_at`=IF(`ticket_comments`.`id`=VALUES(`id`),VALUES(`updated_at`),`ticket_comments`.`updated_at`);

INSERT IGNORE INTO `demo_newmanomilan`.`ticket_status_history` (`id`, `ticket_id`, `ticket_item_id`, `old_status`, `new_status`, `remarks`, `changed_by`, `created_at`)
SELECT o.`id`, o.`ticket_id`, o.`ticket_item_id`, o.`old_status`, o.`new_status`, o.`remarks`, o.`changed_by`, o.`created_at` FROM `demo_manomilan`.`ticket_status_history` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `ticket_id`=IF(`ticket_status_history`.`id`=VALUES(`id`),VALUES(`ticket_id`),`ticket_status_history`.`ticket_id`),
  `ticket_item_id`=IF(`ticket_status_history`.`id`=VALUES(`id`),VALUES(`ticket_item_id`),`ticket_status_history`.`ticket_item_id`),
  `old_status`=IF(`ticket_status_history`.`id`=VALUES(`id`),VALUES(`old_status`),`ticket_status_history`.`old_status`),
  `new_status`=IF(`ticket_status_history`.`id`=VALUES(`id`),VALUES(`new_status`),`ticket_status_history`.`new_status`),
  `remarks`=IF(`ticket_status_history`.`id`=VALUES(`id`),VALUES(`remarks`),`ticket_status_history`.`remarks`),
  `changed_by`=IF(`ticket_status_history`.`id`=VALUES(`id`),VALUES(`changed_by`),`ticket_status_history`.`changed_by`),
  `created_at`=IF(`ticket_status_history`.`id`=VALUES(`id`),VALUES(`created_at`),`ticket_status_history`.`created_at`);

INSERT IGNORE INTO `demo_newmanomilan`.`user_interests` (`id`, `user_id`, `profile_id`, `created_at`, `updated_at`, `status`)
SELECT o.`id`, o.`user_id`, o.`profile_id`, o.`created_at`, o.`updated_at`, o.`status` FROM `demo_manomilan`.`user_interests` o
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `user_id`=IF(`user_interests`.`id`=VALUES(`id`),VALUES(`user_id`),`user_interests`.`user_id`),
  `profile_id`=IF(`user_interests`.`id`=VALUES(`id`),VALUES(`profile_id`),`user_interests`.`profile_id`),
  `created_at`=IF(`user_interests`.`id`=VALUES(`id`),VALUES(`created_at`),`user_interests`.`created_at`),
  `updated_at`=IF(`user_interests`.`id`=VALUES(`id`),VALUES(`updated_at`),`user_interests`.`updated_at`),
  `status`=IF(`user_interests`.`id`=VALUES(`id`),VALUES(`status`),`user_interests`.`status`);

INSERT IGNORE INTO `demo_newmanomilan`.`workshop_registrations` (`id`, `full_name`, `mobile_number`, `whatsapp_number`, `date_of_birth`, `education`, `city`, `district`, `marital_status`, `parent_name`, `parent_contact_number`, `payment_screenshot`, `transaction_id`, `consent`, `status`, `remarks`, `created_at`, `updated_at`)
SELECT o.`id`, o.`full_name`, o.`mobile_number`, o.`whatsapp_number`, o.`date_of_birth`, o.`education`, o.`city`, o.`district`, o.`marital_status`, o.`parent_name`, o.`parent_contact_number`, o.`payment_screenshot`, o.`transaction_id`, o.`consent`, o.`status`, o.`remarks`, o.`created_at`, o.`updated_at` FROM `demo_manomilan`.`workshop_registrations` o WHERE o.transaction_id IS NULL OR CHAR_LENGTH(o.transaction_id) <= 22
ON DUPLICATE KEY UPDATE
  `full_name`=IF(`workshop_registrations`.`id`=VALUES(`id`),VALUES(`full_name`),`workshop_registrations`.`full_name`),
  `mobile_number`=IF(`workshop_registrations`.`id`=VALUES(`id`),VALUES(`mobile_number`),`workshop_registrations`.`mobile_number`),
  `whatsapp_number`=IF(`workshop_registrations`.`id`=VALUES(`id`),VALUES(`whatsapp_number`),`workshop_registrations`.`whatsapp_number`),
  `date_of_birth`=IF(`workshop_registrations`.`id`=VALUES(`id`),VALUES(`date_of_birth`),`workshop_registrations`.`date_of_birth`),
  `education`=IF(`workshop_registrations`.`id`=VALUES(`id`),VALUES(`education`),`workshop_registrations`.`education`),
  `city`=IF(`workshop_registrations`.`id`=VALUES(`id`),VALUES(`city`),`workshop_registrations`.`city`),
  `district`=IF(`workshop_registrations`.`id`=VALUES(`id`),VALUES(`district`),`workshop_registrations`.`district`),
  `marital_status`=IF(`workshop_registrations`.`id`=VALUES(`id`),VALUES(`marital_status`),`workshop_registrations`.`marital_status`),
  `parent_name`=IF(`workshop_registrations`.`id`=VALUES(`id`),VALUES(`parent_name`),`workshop_registrations`.`parent_name`),
  `parent_contact_number`=IF(`workshop_registrations`.`id`=VALUES(`id`),VALUES(`parent_contact_number`),`workshop_registrations`.`parent_contact_number`),
  `payment_screenshot`=IF(`workshop_registrations`.`id`=VALUES(`id`),VALUES(`payment_screenshot`),`workshop_registrations`.`payment_screenshot`),
  `transaction_id`=IF(`workshop_registrations`.`id`=VALUES(`id`),VALUES(`transaction_id`),`workshop_registrations`.`transaction_id`),
  `consent`=IF(`workshop_registrations`.`id`=VALUES(`id`),VALUES(`consent`),`workshop_registrations`.`consent`),
  `status`=IF(`workshop_registrations`.`id`=VALUES(`id`),VALUES(`status`),`workshop_registrations`.`status`),
  `remarks`=IF(`workshop_registrations`.`id`=VALUES(`id`),VALUES(`remarks`),`workshop_registrations`.`remarks`),
  `created_at`=IF(`workshop_registrations`.`id`=VALUES(`id`),VALUES(`created_at`),`workshop_registrations`.`created_at`),
  `updated_at`=IF(`workshop_registrations`.`id`=VALUES(`id`),VALUES(`updated_at`),`workshop_registrations`.`updated_at`);


-- ===== 2. PROFILES: insert missing profiles and refresh matching ids (ALL records incl. duplicate-phone ones)
--  If a phone / registration number conflicts with a different destination profile, that value is left NULL here;
--  the guarded upsert also prevents a unique-key conflict from overwriting the different profile.
INSERT IGNORE INTO `demo_newmanomilan`.`profiles`
 (id, reg_id, groomorbride, full_name, email, source_of_information, phone, birth_date, marital_status, height_cm, weight_kg,
  has_spectacles, blood_group, mother_tongue, languages, special_cases, about_me, profile_photo, selfie_photo, full_body_photo,
  half_body_photo, candidate_photos, additional_photos, addresses, monthly_income, annual_income,
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
  CASE
    WHEN NULLIF(TRIM(o.address),'') IS NULL
      AND NULLIF(TRIM(o.permanent_address),'') IS NULL
      AND NULLIF(TRIM(o.referenceAddress),'') IS NULL
      AND NULLIF(TRIM(o.referenceName),'') IS NULL
      AND NULLIF(TRIM(o.referenceContactNumber),'') IS NULL THEN NULL
    ELSE JSON_OBJECT(
      'current', JSON_OBJECT(
        'address', NULLIF(TRIM(o.address),''),
        'city', NULLIF(TRIM(o.current_city),''),
        'taluka', NULLIF(TRIM(o.tal),''),
        'district', NULLIF(TRIM(o.district),''),
        'state', NULLIF(TRIM(o.state),'')
      ),
      'permanent', JSON_OBJECT(
        'address', NULLIF(TRIM(o.permanent_address),'')
      ),
      'reference', JSON_OBJECT(
        'name', NULLIF(TRIM(o.referenceName),''),
        'relation', NULLIF(TRIM(o.referenceRelation),''),
        'address', NULLIF(TRIM(o.referenceAddress),''),
        'contact', NULLIF(TRIM(o.referenceContactNumber),''),
        'email', NULLIF(TRIM(o.referenceEmail),'')
      )
    )
  END,
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
          SELECT o.id AS profile_id, 1 AS ord1, 0 AS ord2, 'p' AS kind, CONVERT(JSON_ARRAY(o.profilePhoto) USING utf8mb4) COLLATE utf8mb4_unicode_ci AS arr
          FROM `demo_manomilan`.`profiles` o
          WHERE o.profilePhoto IS NOT NULL AND o.profilePhoto NOT IN ('','default.png')
          UNION ALL
          SELECT x.id, 2, 0, 'a', CONVERT(x.arr USING utf8mb4) COLLATE utf8mb4_unicode_ci FROM (
            SELECT o.id, CASE WHEN o.additional_photos IS NULL OR o.additional_photos IN ('','null','[]') OR NOT JSON_VALID(o.additional_photos) THEN NULL
              WHEN JSON_TYPE(o.additional_photos)='STRING' THEN CASE WHEN JSON_VALID(JSON_UNQUOTE(o.additional_photos)) THEN JSON_UNQUOTE(o.additional_photos) END
              ELSE o.additional_photos END AS arr
            FROM `demo_manomilan`.`profiles` o
          ) x WHERE x.arr IS NOT NULL AND JSON_TYPE(x.arr)='ARRAY'
          UNION ALL
          SELECT x.profile_id, 3, x.id, 'c', CONVERT(x.arr USING utf8mb4) COLLATE utf8mb4_unicode_ci FROM (
            SELECT m.id, m.profile_id, CASE WHEN m.candidate_photos IS NULL OR m.candidate_photos IN ('','null','[]') OR NOT JSON_VALID(m.candidate_photos) THEN NULL
              WHEN JSON_TYPE(m.candidate_photos)='STRING' THEN CASE WHEN JSON_VALID(JSON_UNQUOTE(m.candidate_photos)) THEN JSON_UNQUOTE(m.candidate_photos) END
              ELSE m.candidate_photos END AS arr
            FROM `demo_manomilan`.`melava_registrations` m
            WHERE m.profile_id IS NOT NULL
          ) x WHERE x.arr IS NOT NULL AND JSON_TYPE(x.arr)='ARRAY'
          UNION ALL
          SELECT x.profile_id, 4, x.id, 'p', CONVERT(JSON_ARRAY(x.profile_photo) USING utf8mb4) COLLATE utf8mb4_unicode_ci FROM (
            SELECT q.id, q.profile_id, JSON_VALUE(q.registration_data,'$.profilePhoto') AS profile_photo
            FROM `demo_manomilan`.`melava_pending_registrations` q
            WHERE JSON_VALID(q.registration_data)
          ) x WHERE x.profile_photo IS NOT NULL AND x.profile_photo<>''
          UNION ALL
          SELECT x.profile_id, 5, x.id, 'c', CONVERT(x.arr USING utf8mb4) COLLATE utf8mb4_unicode_ci FROM (
            SELECT q.id, q.profile_id, CASE WHEN JSON_VALUE(q.registration_data,'$.candidate_photos') IS NULL OR JSON_VALUE(q.registration_data,'$.candidate_photos') IN ('','null','[]') OR NOT JSON_VALID(JSON_VALUE(q.registration_data,'$.candidate_photos')) THEN NULL
              WHEN JSON_TYPE(JSON_VALUE(q.registration_data,'$.candidate_photos'))='STRING' THEN CASE WHEN JSON_VALID(JSON_UNQUOTE(JSON_VALUE(q.registration_data,'$.candidate_photos'))) THEN JSON_UNQUOTE(JSON_VALUE(q.registration_data,'$.candidate_photos')) END
              ELSE JSON_VALUE(q.registration_data,'$.candidate_photos') END AS arr
            FROM `demo_manomilan`.`melava_pending_registrations` q
            WHERE JSON_VALID(q.registration_data) AND q.profile_id IS NOT NULL
          ) x WHERE x.arr IS NOT NULL AND JSON_TYPE(x.arr)='ARRAY'
          UNION ALL
          SELECT x.profile_id, 6, x.id, 'a', CONVERT(x.arr USING utf8mb4) COLLATE utf8mb4_unicode_ci FROM (
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
          SELECT x.profile_id, 3 AS ord1, x.id AS ord2, CONVERT(x.arr USING utf8mb4) COLLATE utf8mb4_unicode_ci AS arr
          FROM (
            SELECT m.id, m.profile_id, CASE WHEN m.candidate_photos IS NULL OR m.candidate_photos IN ('','null','[]') OR NOT JSON_VALID(m.candidate_photos) THEN NULL
              WHEN JSON_TYPE(m.candidate_photos)='STRING' THEN CASE WHEN JSON_VALID(JSON_UNQUOTE(m.candidate_photos)) THEN JSON_UNQUOTE(m.candidate_photos) END
              ELSE m.candidate_photos END AS arr
            FROM `demo_manomilan`.`melava_registrations` m
            WHERE m.profile_id IS NOT NULL
          ) x WHERE x.arr IS NOT NULL AND JSON_TYPE(x.arr)='ARRAY'
          UNION ALL
          SELECT x.profile_id, 5, x.id, CONVERT(x.arr USING utf8mb4) COLLATE utf8mb4_unicode_ci
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
WHERE TRUE
ON DUPLICATE KEY UPDATE
`reg_id`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`reg_id`),`profiles`.`reg_id`),
`groomorbride`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`groomorbride`),`profiles`.`groomorbride`),
`full_name`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`full_name`),`profiles`.`full_name`),
`email`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`email`),`profiles`.`email`),
`source_of_information`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`source_of_information`),`profiles`.`source_of_information`),
`phone`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`phone`),`profiles`.`phone`),
`birth_date`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`birth_date`),`profiles`.`birth_date`),
`marital_status`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`marital_status`),`profiles`.`marital_status`),
`height_cm`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`height_cm`),`profiles`.`height_cm`),
`weight_kg`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`weight_kg`),`profiles`.`weight_kg`),
`has_spectacles`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`has_spectacles`),`profiles`.`has_spectacles`),
`blood_group`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`blood_group`),`profiles`.`blood_group`),
`mother_tongue`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`mother_tongue`),`profiles`.`mother_tongue`),
`languages`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`languages`),`profiles`.`languages`),
`special_cases`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`special_cases`),`profiles`.`special_cases`),
`about_me`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`about_me`),`profiles`.`about_me`),
`profile_photo`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`profile_photo`),`profiles`.`profile_photo`),
`selfie_photo`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`selfie_photo`),`profiles`.`selfie_photo`),
`full_body_photo`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`full_body_photo`),`profiles`.`full_body_photo`),
`half_body_photo`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`half_body_photo`),`profiles`.`half_body_photo`),
`candidate_photos`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`candidate_photos`),`profiles`.`candidate_photos`),
`additional_photos`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`additional_photos`),`profiles`.`additional_photos`),
`addresses`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`addresses`),`profiles`.`addresses`),
`monthly_income`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`monthly_income`),`profiles`.`monthly_income`),
`annual_income`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`annual_income`),`profiles`.`annual_income`),
`personal_medical_history`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`personal_medical_history`),`profiles`.`personal_medical_history`),
`current_medical_problems`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`current_medical_problems`),`profiles`.`current_medical_problems`),
`medications`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`medications`),`profiles`.`medications`),
`has_medical_history`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`has_medical_history`),`profiles`.`has_medical_history`),
`birth_place`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`birth_place`),`profiles`.`birth_place`),
`birth_time`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`birth_time`),`profiles`.`birth_time`),
`creator_relation`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`creator_relation`),`profiles`.`creator_relation`),
`profile_creator_name`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`profile_creator_name`),`profiles`.`profile_creator_name`),
`verification_status`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`verification_status`),`profiles`.`verification_status`),
`status`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`status`),`profiles`.`status`),
`created_at`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`created_at`),`profiles`.`created_at`),
`updated_at`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`updated_at`),`profiles`.`updated_at`),
`profile_completion`=IF(`profiles`.`id`=VALUES(`id`),VALUES(`profile_completion`),`profiles`.`profile_completion`);

-- ===== 3. PROFILE CHILD TABLES (matching rows refreshed; missing rows inserted)
INSERT INTO `demo_newmanomilan`.`profile_education` (`id`, `profile_id`, `education_level`, `degree_name`, `specialization`, `university_name`, `education_city`, `additional_qualification`, `education_certificate`, `created_at`, `updated_at`)
SELECT o.id, o.id, NULLIF(o.education,''), NULLIF(o.degreeDiplomaName1,''), NULLIF(o.specialisation1,''), NULLIF(o.universityBoardCollege,''), NULLIF(o.cityOfEducation,''), NULLIF(CONCAT_WS(', ',NULLIF(o.additionalEducation1,''),NULLIF(o.additionalEducation2,'')),''), NULLIF(o.educationProof,''), o.created_at, o.updated_at
FROM `demo_manomilan`.`profiles` o JOIN `demo_newmanomilan`.`profiles` n ON n.id=o.id
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `education_level`=IF(`profile_education`.`profile_id`=VALUES(`profile_id`),VALUES(`education_level`),`profile_education`.`education_level`),
  `degree_name`=IF(`profile_education`.`profile_id`=VALUES(`profile_id`),VALUES(`degree_name`),`profile_education`.`degree_name`),
  `specialization`=IF(`profile_education`.`profile_id`=VALUES(`profile_id`),VALUES(`specialization`),`profile_education`.`specialization`),
  `university_name`=IF(`profile_education`.`profile_id`=VALUES(`profile_id`),VALUES(`university_name`),`profile_education`.`university_name`),
  `education_city`=IF(`profile_education`.`profile_id`=VALUES(`profile_id`),VALUES(`education_city`),`profile_education`.`education_city`),
  `additional_qualification`=IF(`profile_education`.`profile_id`=VALUES(`profile_id`),VALUES(`additional_qualification`),`profile_education`.`additional_qualification`),
  `education_certificate`=IF(`profile_education`.`profile_id`=VALUES(`profile_id`),VALUES(`education_certificate`),`profile_education`.`education_certificate`),
  `created_at`=IF(`profile_education`.`profile_id`=VALUES(`profile_id`),VALUES(`created_at`),`profile_education`.`created_at`),
  `updated_at`=IF(`profile_education`.`profile_id`=VALUES(`profile_id`),VALUES(`updated_at`),`profile_education`.`updated_at`);

-- second degree (degreeDiplomaName2 / specialisation2) as an extra education row
UPDATE `demo_newmanomilan`.`profile_education` e
JOIN (
  SELECT profile_id, MIN(id) AS id
  FROM `demo_newmanomilan`.`profile_education`
  WHERE id <> profile_id
  GROUP BY profile_id
) secondary ON secondary.id=e.id
JOIN `demo_manomilan`.`profiles` o ON o.id=e.profile_id
SET e.education_level=NULLIF(o.education,''),
    e.degree_name=NULLIF(o.degreeDiplomaName2,''),
    e.specialization=NULLIF(o.specialisation2,''),
    e.university_name=NULLIF(o.universityBoardCollege,''),
    e.education_city=NULLIF(o.cityOfEducation,''),
    e.created_at=o.created_at,
    e.updated_at=o.updated_at
WHERE NULLIF(o.degreeDiplomaName2,'') IS NOT NULL OR NULLIF(o.specialisation2,'') IS NOT NULL;

INSERT INTO `demo_newmanomilan`.`profile_education` (profile_id, education_level, degree_name, specialization, university_name, education_city, created_at, updated_at)
SELECT o.id, NULLIF(o.education,''), NULLIF(o.degreeDiplomaName2,''), NULLIF(o.specialisation2,''), NULLIF(o.universityBoardCollege,''), NULLIF(o.cityOfEducation,''), o.created_at, o.updated_at
FROM `demo_manomilan`.`profiles` o JOIN `demo_newmanomilan`.`profiles` n ON n.id=o.id WHERE (NULLIF(o.degreeDiplomaName2,'') IS NOT NULL OR NULLIF(o.specialisation2,'') IS NOT NULL)
 AND NOT EXISTS (SELECT 1 FROM `demo_newmanomilan`.`profile_education` e WHERE e.profile_id=o.id AND e.degree_name <=> NULLIF(o.degreeDiplomaName2,'') AND e.specialization <=> NULLIF(o.specialisation2,''));

INSERT INTO `demo_newmanomilan`.`profile_employment` (`id`, `profile_id`, `profession`, `working_field`, `organisation_name`, `designation`, `employment_city`, `employment_duration`, `monthly_income`, `annual_income`, `income_currency`, `original_monthly_income`, `original_annual_income`, `created_at`, `updated_at`)
SELECT o.id, o.id, NULLIF(o.profession,''), NULLIF(o.fieldOfWorking,''), NULLIF(o.organisationWorkingIn,''), NULLIF(o.designation,''), NULLIF(o.professionalCity,''), NULLIF(o.lengthOfEmployment,''), (CASE WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.monthlyIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') REGEXP '^[0-9]{1,13}([.][0-9]{1,2})?$' THEN CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.monthlyIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') AS DECIMAL(15,2)) END), (CASE WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.annualIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') REGEXP '^[0-9]{1,13}([.][0-9]{1,2})?$' THEN CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.annualIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') AS DECIMAL(15,2)) END), o.income_currency, o.original_monthly_income, o.original_annual_income, o.created_at, o.updated_at
FROM `demo_manomilan`.`profiles` o JOIN `demo_newmanomilan`.`profiles` n ON n.id=o.id
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `profession`=IF(`profile_employment`.`profile_id`=VALUES(`profile_id`),VALUES(`profession`),`profile_employment`.`profession`),
  `working_field`=IF(`profile_employment`.`profile_id`=VALUES(`profile_id`),VALUES(`working_field`),`profile_employment`.`working_field`),
  `organisation_name`=IF(`profile_employment`.`profile_id`=VALUES(`profile_id`),VALUES(`organisation_name`),`profile_employment`.`organisation_name`),
  `designation`=IF(`profile_employment`.`profile_id`=VALUES(`profile_id`),VALUES(`designation`),`profile_employment`.`designation`),
  `employment_city`=IF(`profile_employment`.`profile_id`=VALUES(`profile_id`),VALUES(`employment_city`),`profile_employment`.`employment_city`),
  `employment_duration`=IF(`profile_employment`.`profile_id`=VALUES(`profile_id`),VALUES(`employment_duration`),`profile_employment`.`employment_duration`),
  `monthly_income`=IF(`profile_employment`.`profile_id`=VALUES(`profile_id`),VALUES(`monthly_income`),`profile_employment`.`monthly_income`),
  `annual_income`=IF(`profile_employment`.`profile_id`=VALUES(`profile_id`),VALUES(`annual_income`),`profile_employment`.`annual_income`),
  `income_currency`=IF(`profile_employment`.`profile_id`=VALUES(`profile_id`),VALUES(`income_currency`),`profile_employment`.`income_currency`),
  `original_monthly_income`=IF(`profile_employment`.`profile_id`=VALUES(`profile_id`),VALUES(`original_monthly_income`),`profile_employment`.`original_monthly_income`),
  `original_annual_income`=IF(`profile_employment`.`profile_id`=VALUES(`profile_id`),VALUES(`original_annual_income`),`profile_employment`.`original_annual_income`),
  `created_at`=IF(`profile_employment`.`profile_id`=VALUES(`profile_id`),VALUES(`created_at`),`profile_employment`.`created_at`),
  `updated_at`=IF(`profile_employment`.`profile_id`=VALUES(`profile_id`),VALUES(`updated_at`),`profile_employment`.`updated_at`);

INSERT INTO `demo_newmanomilan`.`profile_family_details` (`id`, `profile_id`, `father_name`, `father_status`, `father_native_place`, `father_occupation`, `father_contact`, `mother_name`, `mother_status`, `mother_native_place`, `mother_occupation`, `mother_contact`, `brothers_count`, `married_brothers_count`, `sisters_count`, `married_sisters_count`, `parents_intercaste_marriage`, `parents_different_caste_details`, `family_values`, `family_financial_status`, `family_annual_income`, `created_at`, `updated_at`)
SELECT o.id, o.id, NULLIF(o.fathersName,''), (CASE o.fatherAlive WHEN 'Yes' THEN 'Alive' WHEN 'No' THEN 'Deceased' END), NULLIF(o.fathersNativePlace,''), NULLIF(o.fathersOccupation,''), NULLIF(o.fatherContactNumber,''), NULLIF(o.mothersName,''), (CASE o.motherAlive WHEN 'Yes' THEN 'Alive' WHEN 'No' THEN 'Deceased' END), NULLIF(o.mothersNativePlace,''), NULLIF(o.mothersOccupation,''), NULLIF(o.motherContactNumber,''), o.noOfBrothers, o.brothersMarried, o.noOfSisters, o.sistersMarried, (CASE o.parentsIntercasteMarriage WHEN 'Yes' THEN 1 WHEN 'No' THEN 0 END), NULLIF(o.parentsDifferentCaste,''), NULLIF(o.familyValues,''), NULLIF(o.familyFinancialStatus,''), (CASE WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.familyAnnualIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') REGEXP '^[0-9]{1,13}([.][0-9]{1,2})?$' THEN CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(TRIM(o.familyAnnualIncome)),'rs.',''),'rs',''),'₹',''),'/-',''),',',''),' ','') AS DECIMAL(15,2)) END), o.created_at, o.updated_at
FROM `demo_manomilan`.`profiles` o JOIN `demo_newmanomilan`.`profiles` n ON n.id=o.id
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `father_name`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`father_name`),`profile_family_details`.`father_name`),
  `father_status`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`father_status`),`profile_family_details`.`father_status`),
  `father_native_place`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`father_native_place`),`profile_family_details`.`father_native_place`),
  `father_occupation`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`father_occupation`),`profile_family_details`.`father_occupation`),
  `father_contact`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`father_contact`),`profile_family_details`.`father_contact`),
  `mother_name`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`mother_name`),`profile_family_details`.`mother_name`),
  `mother_status`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`mother_status`),`profile_family_details`.`mother_status`),
  `mother_native_place`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`mother_native_place`),`profile_family_details`.`mother_native_place`),
  `mother_occupation`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`mother_occupation`),`profile_family_details`.`mother_occupation`),
  `mother_contact`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`mother_contact`),`profile_family_details`.`mother_contact`),
  `brothers_count`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`brothers_count`),`profile_family_details`.`brothers_count`),
  `married_brothers_count`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`married_brothers_count`),`profile_family_details`.`married_brothers_count`),
  `sisters_count`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`sisters_count`),`profile_family_details`.`sisters_count`),
  `married_sisters_count`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`married_sisters_count`),`profile_family_details`.`married_sisters_count`),
  `parents_intercaste_marriage`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`parents_intercaste_marriage`),`profile_family_details`.`parents_intercaste_marriage`),
  `parents_different_caste_details`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`parents_different_caste_details`),`profile_family_details`.`parents_different_caste_details`),
  `family_values`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`family_values`),`profile_family_details`.`family_values`),
  `family_financial_status`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`family_financial_status`),`profile_family_details`.`family_financial_status`),
  `family_annual_income`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`family_annual_income`),`profile_family_details`.`family_annual_income`),
  `created_at`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`created_at`),`profile_family_details`.`created_at`),
  `updated_at`=IF(`profile_family_details`.`profile_id`=VALUES(`profile_id`),VALUES(`updated_at`),`profile_family_details`.`updated_at`);

INSERT INTO `demo_newmanomilan`.`profile_religion_details` (`id`, `profile_id`, `religion`, `caste`, `sub_caste`, `rashi`, `nakshatra`, `charan`, `nadi`, `gan`, `gotra`, `created_at`, `updated_at`)
SELECT o.id, o.id, NULLIF(o.religion,''), NULLIF(o.caste,''), NULLIF(o.subCaste,''), NULLIF(o.rashi,''), NULLIF(o.nakshatra,''), NULLIF(o.charan,''), NULLIF(o.nadi,''), NULLIF(o.gan,''), NULLIF(o.gotra,''), o.created_at, o.updated_at
FROM `demo_manomilan`.`profiles` o JOIN `demo_newmanomilan`.`profiles` n ON n.id=o.id
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `religion`=IF(`profile_religion_details`.`profile_id`=VALUES(`profile_id`),VALUES(`religion`),`profile_religion_details`.`religion`),
  `caste`=IF(`profile_religion_details`.`profile_id`=VALUES(`profile_id`),VALUES(`caste`),`profile_religion_details`.`caste`),
  `sub_caste`=IF(`profile_religion_details`.`profile_id`=VALUES(`profile_id`),VALUES(`sub_caste`),`profile_religion_details`.`sub_caste`),
  `rashi`=IF(`profile_religion_details`.`profile_id`=VALUES(`profile_id`),VALUES(`rashi`),`profile_religion_details`.`rashi`),
  `nakshatra`=IF(`profile_religion_details`.`profile_id`=VALUES(`profile_id`),VALUES(`nakshatra`),`profile_religion_details`.`nakshatra`),
  `charan`=IF(`profile_religion_details`.`profile_id`=VALUES(`profile_id`),VALUES(`charan`),`profile_religion_details`.`charan`),
  `nadi`=IF(`profile_religion_details`.`profile_id`=VALUES(`profile_id`),VALUES(`nadi`),`profile_religion_details`.`nadi`),
  `gan`=IF(`profile_religion_details`.`profile_id`=VALUES(`profile_id`),VALUES(`gan`),`profile_religion_details`.`gan`),
  `gotra`=IF(`profile_religion_details`.`profile_id`=VALUES(`profile_id`),VALUES(`gotra`),`profile_religion_details`.`gotra`),
  `created_at`=IF(`profile_religion_details`.`profile_id`=VALUES(`profile_id`),VALUES(`created_at`),`profile_religion_details`.`created_at`),
  `updated_at`=IF(`profile_religion_details`.`profile_id`=VALUES(`profile_id`),VALUES(`updated_at`),`profile_religion_details`.`updated_at`);

INSERT INTO `demo_newmanomilan`.`profile_documents` (`id`, `profile_id`, `aadhaar_card`, `pan_card`, `passport`, `birth_certificate`, `address_proof`, `education_certificate`, `profession_proof`, `income_proof`, `caste_certificate`, `medical_fitness_certificate`, `created_at`, `updated_at`)
SELECT o.id, o.id,
  CASE
    WHEN NULLIF(TRIM(o.identificationProof),'') IS NULL
      OR LOWER(o.identificationProof) LIKE '%pan%'
      OR LOWER(o.identificationProof) LIKE '%passport%' THEN NULL
    ELSE NULLIF(o.identificationProof,'')
  END,
  CASE WHEN LOWER(COALESCE(o.identificationProof,'')) LIKE '%pan%' THEN NULLIF(o.identificationProof,'') END,
  CASE WHEN LOWER(COALESCE(o.identificationProof,'')) LIKE '%passport%' THEN NULLIF(o.identificationProof,'') END,
  NULLIF(o.birthDateProof,''), NULLIF(o.addressProof,''), NULLIF(o.educationProof,''), NULLIF(o.professionProof,''), NULLIF(o.incomeProof,''), NULLIF(o.casteCertificate,''), NULLIF(o.medicalFitnessCertificate,''), o.created_at, o.updated_at
FROM `demo_manomilan`.`profiles` o JOIN `demo_newmanomilan`.`profiles` n ON n.id=o.id
WHERE TRUE
ON DUPLICATE KEY UPDATE
  `aadhaar_card`=IF(`profile_documents`.`profile_id`=VALUES(`profile_id`),VALUES(`aadhaar_card`),`profile_documents`.`aadhaar_card`),
  `pan_card`=IF(`profile_documents`.`profile_id`=VALUES(`profile_id`),VALUES(`pan_card`),`profile_documents`.`pan_card`),
  `passport`=IF(`profile_documents`.`profile_id`=VALUES(`profile_id`),VALUES(`passport`),`profile_documents`.`passport`),
  `birth_certificate`=IF(`profile_documents`.`profile_id`=VALUES(`profile_id`),VALUES(`birth_certificate`),`profile_documents`.`birth_certificate`),
  `address_proof`=IF(`profile_documents`.`profile_id`=VALUES(`profile_id`),VALUES(`address_proof`),`profile_documents`.`address_proof`),
  `education_certificate`=IF(`profile_documents`.`profile_id`=VALUES(`profile_id`),VALUES(`education_certificate`),`profile_documents`.`education_certificate`),
  `profession_proof`=IF(`profile_documents`.`profile_id`=VALUES(`profile_id`),VALUES(`profession_proof`),`profile_documents`.`profession_proof`),
  `income_proof`=IF(`profile_documents`.`profile_id`=VALUES(`profile_id`),VALUES(`income_proof`),`profile_documents`.`income_proof`),
  `caste_certificate`=IF(`profile_documents`.`profile_id`=VALUES(`profile_id`),VALUES(`caste_certificate`),`profile_documents`.`caste_certificate`),
  `medical_fitness_certificate`=IF(`profile_documents`.`profile_id`=VALUES(`profile_id`),VALUES(`medical_fitness_certificate`),`profile_documents`.`medical_fitness_certificate`),
  `created_at`=IF(`profile_documents`.`profile_id`=VALUES(`profile_id`),VALUES(`created_at`),`profile_documents`.`created_at`),
  `updated_at`=IF(`profile_documents`.`profile_id`=VALUES(`profile_id`),VALUES(`updated_at`),`profile_documents`.`updated_at`);

-- partner preferences (old preferences -> profile via old users.profile_id)
INSERT INTO `demo_newmanomilan`.`profile_partner_preferences` (id, profile_id, `preferred_religion`, `age_from`, `age_to`, `height_from`, `height_to`, `preferred_education`, `preferred_working_field`, `working_partner`, `expected_income`, `family_type`, `financial_background`, `family_values`, `preferred_caste`, `preferred_sub_caste`, `preferred_location`, `preferred_country`, `preferred_state`, `preferred_city`, `other_expectations`, created_at, updated_at)
SELECT p.id, u.profile_id, p.`preferred_religion`, p.`age_from`, p.`age_to`, p.`height_from`, p.`height_to`, p.`preferred_education`, p.`preferred_working_field`, p.`working_partner`, p.`expected_income`, p.`family_type`, p.`financial_background`, p.`family_values`, p.`preferred_caste`, p.`preferred_sub_caste`, p.`preferred_location`, p.`preferred_country`, p.`preferred_state`, p.`preferred_city`, p.`other_expectations`, p.created_at, p.updated_at
FROM `demo_manomilan`.`preferences` p JOIN `demo_manomilan`.`users` u ON u.id=p.user_id JOIN `demo_newmanomilan`.`profiles` n ON n.id=u.profile_id
WHERE TRUE
ON DUPLICATE KEY UPDATE `preferred_religion`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`preferred_religion`),`profile_partner_preferences`.`preferred_religion`), `age_from`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`age_from`),`profile_partner_preferences`.`age_from`), `age_to`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`age_to`),`profile_partner_preferences`.`age_to`), `height_from`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`height_from`),`profile_partner_preferences`.`height_from`), `height_to`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`height_to`),`profile_partner_preferences`.`height_to`), `preferred_education`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`preferred_education`),`profile_partner_preferences`.`preferred_education`), `preferred_working_field`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`preferred_working_field`),`profile_partner_preferences`.`preferred_working_field`), `working_partner`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`working_partner`),`profile_partner_preferences`.`working_partner`), `expected_income`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`expected_income`),`profile_partner_preferences`.`expected_income`), `family_type`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`family_type`),`profile_partner_preferences`.`family_type`), `financial_background`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`financial_background`),`profile_partner_preferences`.`financial_background`), `family_values`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`family_values`),`profile_partner_preferences`.`family_values`), `preferred_caste`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`preferred_caste`),`profile_partner_preferences`.`preferred_caste`), `preferred_sub_caste`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`preferred_sub_caste`),`profile_partner_preferences`.`preferred_sub_caste`), `preferred_location`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`preferred_location`),`profile_partner_preferences`.`preferred_location`), `preferred_country`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`preferred_country`),`profile_partner_preferences`.`preferred_country`), `preferred_state`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`preferred_state`),`profile_partner_preferences`.`preferred_state`), `preferred_city`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`preferred_city`),`profile_partner_preferences`.`preferred_city`), `other_expectations`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`other_expectations`),`profile_partner_preferences`.`other_expectations`), `created_at`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`created_at`),`profile_partner_preferences`.`created_at`), `updated_at`=IF(`profile_partner_preferences`.`profile_id`=VALUES(`profile_id`),VALUES(`updated_at`),`profile_partner_preferences`.`updated_at`);


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
WHERE o.profile_id IN (SELECT id FROM `demo_newmanomilan`.`profiles`)
ON DUPLICATE KEY UPDATE
  `melava_campaign_id`=IF(`profile_melava_registrations`.`profile_id`=VALUES(`profile_id`),VALUES(`melava_campaign_id`),`profile_melava_registrations`.`melava_campaign_id`),
  `is_booklet_req`=IF(`profile_melava_registrations`.`profile_id`=VALUES(`profile_id`),VALUES(`is_booklet_req`),`profile_melava_registrations`.`is_booklet_req`),
  `payment_screenshot`=IF(`profile_melava_registrations`.`profile_id`=VALUES(`profile_id`),VALUES(`payment_screenshot`),`profile_melava_registrations`.`payment_screenshot`),
  `payment_verified`=IF(`profile_melava_registrations`.`profile_id`=VALUES(`profile_id`),VALUES(`payment_verified`),`profile_melava_registrations`.`payment_verified`),
  `created_at`=IF(`profile_melava_registrations`.`profile_id`=VALUES(`profile_id`),VALUES(`created_at`),`profile_melava_registrations`.`created_at`),
  `updated_at`=IF(`profile_melava_registrations`.`profile_id`=VALUES(`profile_id`),VALUES(`updated_at`),`profile_melava_registrations`.`updated_at`),
  `booklet_payment_screenshot`=IF(`profile_melava_registrations`.`profile_id`=VALUES(`profile_id`),VALUES(`booklet_payment_screenshot`),`profile_melava_registrations`.`booklet_payment_screenshot`),
  `booklet_payment_verified`=IF(`profile_melava_registrations`.`profile_id`=VALUES(`profile_id`),VALUES(`booklet_payment_verified`),`profile_melava_registrations`.`booklet_payment_verified`);


-- Photo references are rebuilt from the old source during both insert and same-id profile refresh.


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

-- address mismatches after the profile refresh (should return no rows)
SELECT o.id, o.fullName, o.address, o.permanent_address,
  JSON_UNQUOTE(JSON_EXTRACT(n.addresses,'$.current.address')) AS new_current_address,
  JSON_UNQUOTE(JSON_EXTRACT(n.addresses,'$.permanent.address')) AS new_permanent_address
FROM `demo_manomilan`.profiles o
JOIN `demo_newmanomilan`.profiles n ON n.id=o.id
WHERE COALESCE(NULLIF(TRIM(o.address),''),'') <> COALESCE(JSON_UNQUOTE(JSON_EXTRACT(n.addresses,'$.current.address')),'')
   OR COALESCE(NULLIF(TRIM(o.permanent_address),''),'') <> COALESCE(JSON_UNQUOTE(JSON_EXTRACT(n.addresses,'$.permanent.address')),'');

-- document path mismatches after the profile refresh (should return no rows)
SELECT o.id, o.fullName, o.identificationProof, o.birthDateProof,
  COALESCE(d.aadhaar_card,d.pan_card,d.passport) AS new_identification_proof,
  d.birth_certificate AS new_birth_date_proof
FROM `demo_manomilan`.profiles o
JOIN `demo_newmanomilan`.profiles n ON n.id=o.id
LEFT JOIN `demo_newmanomilan`.profile_documents d ON d.profile_id=n.id
WHERE COALESCE(NULLIF(o.identificationProof,''),'') <> COALESCE(d.aadhaar_card,d.pan_card,d.passport,'')
   OR COALESCE(NULLIF(o.birthDateProof,''),'') <> COALESCE(d.birth_certificate,'');

-- old profiles that have a melava photo but whose new profile has none of it
SELECT m.profile_id, m.candidate_photos FROM `demo_manomilan`.melava_registrations m JOIN `demo_newmanomilan`.profiles p ON p.id=m.profile_id
WHERE m.candidate_photos IS NOT NULL AND m.candidate_photos NOT IN ('','null','[]') AND p.candidate_photos IS NULL;

-- old users NOT copied because of duplicate username
SELECT id,name,username,email FROM `demo_manomilan`.users WHERE id NOT IN (SELECT id FROM `demo_newmanomilan`.users);