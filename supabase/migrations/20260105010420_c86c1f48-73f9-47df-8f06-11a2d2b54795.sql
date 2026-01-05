-- =====================================================
-- PRE-PUBLICATION CLEANUP: Remove Test Data
-- =====================================================
-- This migration removes all test user data while preserving
-- the master content (questions, quizzes, training materials).
-- 
-- WHAT GETS DELETED:
-- - All quiz attempts (test submissions)
-- - All user training progress (test completions)
-- - All training assignments (test assignments)
-- - All certificates (test certificates)
-- - All audit logs (test activity)
-- - All content releases (test releases)
-- - All package releases (test releases)
-- - All question releases (test releases)
-- - All user profiles (test users)
-- - All user roles (test roles)
-- - All organizations except 'platform-owner' (test orgs)
--
-- WHAT IS PRESERVED:
-- - quiz_questions (600 master questions)
-- - quizzes (quiz definitions)
-- - training_materials (training content)
-- - hipaa_topics (HIPAA topic mappings)
-- - question_packages (packaged question sets)
-- - package_questions (question-to-package mappings)
-- =====================================================

-- Step 1: Delete user activity data (depends on profiles/users)
DELETE FROM quiz_attempts;
DELETE FROM user_training_progress;
DELETE FROM training_assignments;
DELETE FROM certificates;
DELETE FROM audit_logs;

-- Step 2: Delete content release records
DELETE FROM content_releases;
DELETE FROM package_releases;
DELETE FROM question_releases;

-- Step 3: Delete user profiles and roles
DELETE FROM profiles;
DELETE FROM user_roles;

-- Step 4: Delete test organizations (keep platform-owner org if you want)
-- Uncomment the next line if you want to delete ALL organizations including platform-owner:
-- DELETE FROM organizations;

-- Or keep the platform-owner organization:
DELETE FROM organizations WHERE slug != 'platform-owner';