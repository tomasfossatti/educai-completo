CREATE TABLE "class_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_section_id" uuid NOT NULL,
	"sequence_no" integer NOT NULL,
	"planned_date" date NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"planned_topic_node_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actual_topic_node_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actual_summary" text,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "course_section_teachers" (
	"course_section_id" uuid NOT NULL,
	"teacher_user_id" uuid NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_section_teachers_course_section_id_teacher_user_id_pk" PRIMARY KEY("course_section_id","teacher_user_id")
);
--> statement-breakpoint
CREATE TABLE "course_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"institution_id" uuid NOT NULL,
	"name" text NOT NULL,
	"term" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"join_code" text NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"classroom_context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_sections_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_section_id" uuid NOT NULL,
	"student_user_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "institutions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_section_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"locale" text DEFAULT 'es-AR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curriculum_version_id" uuid NOT NULL,
	"course_section_id" uuid NOT NULL,
	"node_id" uuid NOT NULL,
	"stable_key" text NOT NULL,
	"statement" text NOT NULL,
	"short_label" text NOT NULL,
	"student_explanation" text,
	"action_verb" text,
	"target_cognitive_level" text NOT NULL,
	"importance" text DEFAULT 'medium' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"planned_class_no" integer,
	"known_error_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"provenance" text DEFAULT 'official_explicit' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_prerequisites" (
	"capability_id" uuid NOT NULL,
	"prerequisite_capability_id" uuid NOT NULL,
	"criticality" text DEFAULT 'medium' NOT NULL,
	CONSTRAINT "capability_prerequisites_capability_id_prerequisite_capability_id_pk" PRIMARY KEY("capability_id","prerequisite_capability_id")
);
--> statement-breakpoint
CREATE TABLE "curriculum_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curriculum_version_id" uuid NOT NULL,
	"course_section_id" uuid NOT NULL,
	"parent_id" uuid,
	"node_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"planned_class_no" integer,
	"provenance" text DEFAULT 'official_explicit' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_section_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source" text DEFAULT 'teacher' NOT NULL,
	"draft" jsonb,
	"extractor" text,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_section_id" uuid NOT NULL,
	"material_type" text DEFAULT 'program' NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"content_hash" text NOT NULL,
	"extracted_text" text,
	"page_count" integer,
	"status" text NOT NULL,
	"warning" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_artifact_id" uuid NOT NULL,
	"student_user_id" uuid NOT NULL,
	"course_section_id" uuid NOT NULL,
	"capability_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_conversations_source_artifact_id_unique" UNIQUE("source_artifact_id")
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sequence_no" integer NOT NULL,
	"actor" text NOT NULL,
	"mode" text DEFAULT 'learning' NOT NULL,
	"content" text NOT NULL,
	"model_name" text,
	"prompt_version" text,
	"assistance_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_user_id" uuid NOT NULL,
	"course_section_id" uuid NOT NULL,
	"source_artifact_id" uuid NOT NULL,
	"opportunity_id" uuid,
	"raw_interaction_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"event_type" text NOT NULL,
	"task_context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"student_action" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cognitive_demand" text NOT NULL,
	"assistance_level" text NOT NULL,
	"provenance_quality" text NOT NULL,
	"deduplication_key" text NOT NULL,
	"processor_version" text NOT NULL,
	"validity_status" text DEFAULT 'valid' NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_invalidations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evidence_event_id" uuid NOT NULL,
	"source_artifact_id" uuid NOT NULL,
	"reason_code" text NOT NULL,
	"invalidated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evidence_event_id" uuid NOT NULL,
	"student_user_id" uuid NOT NULL,
	"course_section_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"independence_group_key" text NOT NULL,
	"source_artifact_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"performance" text NOT NULL,
	"polarity" text NOT NULL,
	"demonstrated_level" text NOT NULL,
	"task_cognitive_demand" text NOT NULL,
	"error_type" text,
	"normalized_error_key" text,
	"mapping_confidence" real NOT NULL,
	"evidence_quality_band" text NOT NULL,
	"assistance_level" text NOT NULL,
	"provenance_quality" text NOT NULL,
	"state_eligible" boolean NOT NULL,
	"rationale" text NOT NULL,
	"student_excerpt" text,
	"validity_status" text DEFAULT 'valid' NOT NULL,
	"processor_version" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_user_id" uuid NOT NULL,
	"course_section_id" uuid NOT NULL,
	"source_artifact_id" uuid NOT NULL,
	"opportunity_family_key" text NOT NULL,
	"target_capability_id" uuid NOT NULL,
	"cognitive_demand" text NOT NULL,
	"attempt_no" integer DEFAULT 1 NOT NULL,
	"prior_feedback_received" boolean DEFAULT false NOT NULL,
	"independence_group_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_user_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"source_type" text NOT NULL,
	"profile_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_artifact_id" uuid NOT NULL,
	"student_user_id" uuid NOT NULL,
	"course_section_id" uuid NOT NULL,
	"actor" text NOT NULL,
	"interaction_type" text NOT NULL,
	"content_text" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sequence_no" integer DEFAULT 0 NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_user_id" uuid NOT NULL,
	"course_section_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"title" text NOT NULL,
	"external_provider" text,
	"content_hash" text,
	"raw_content" text,
	"provenance_quality" text DEFAULT 'direct' NOT NULL,
	"processing_status" text DEFAULT 'ready' NOT NULL,
	"parser_version" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"student_user_id" uuid PRIMARY KEY NOT NULL,
	"current_profile_version" integer DEFAULT 1 NOT NULL,
	"onboarding_status" text NOT NULL,
	"personalization_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task" text NOT NULL,
	"prompt_version" text NOT NULL,
	"model" text,
	"status" text NOT NULL,
	"fallback_used" boolean DEFAULT false NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd_estimate" real DEFAULT 0 NOT NULL,
	"error" text,
	"course_section_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_interpretations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_user_id" uuid NOT NULL,
	"course_section_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"visible_state" text NOT NULL,
	"maturity_state" text NOT NULL,
	"attention_state" text NOT NULL,
	"evidence_sufficiency" text NOT NULL,
	"interpretation_confidence" text NOT NULL,
	"highest_reliably_demonstrated_level" text,
	"historical_peak_state" text DEFAULT 'unknown' NOT NULL,
	"supporting_opportunity_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"challenging_opportunity_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unresolved_error_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contradictions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"next_evidence_need" jsonb NOT NULL,
	"prerequisite_risk" jsonb DEFAULT '{"atRisk":false,"prerequisiteCapabilityIds":[]}'::jsonb NOT NULL,
	"rationale" jsonb NOT NULL,
	"eligible_opportunity_count" integer DEFAULT 0 NOT NULL,
	"input_hash" text NOT NULL,
	"engine_version" text NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_feedback_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_section_id" uuid NOT NULL,
	"class_session_id" uuid,
	"respondent_count" integer NOT NULL,
	"worked" text NOT NULL,
	"main_opportunity" text NOT NULL,
	"other_patterns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"try_next" text NOT NULL,
	"small_cell_suppressed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classroom_capability_projection" (
	"course_section_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"enrolled_count" integer NOT NULL,
	"evidence_sufficient_count" integer NOT NULL,
	"with_any_evidence_count" integer NOT NULL,
	"unknown_count" integer NOT NULL,
	"developing_count" integer NOT NULL,
	"solid_count" integer NOT NULL,
	"needs_review_count" integer NOT NULL,
	"needs_review_rate" real,
	"evidence_coverage" real NOT NULL,
	"confirmed_error_patterns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cognitive_gap_count" integer DEFAULT 0 NOT NULL,
	"contradiction_count" integer DEFAULT 0 NOT NULL,
	"source_type_counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"trend" text DEFAULT 'unknown' NOT NULL,
	"projection_version" integer DEFAULT 1 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classroom_capability_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_section_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"label" text NOT NULL,
	"evidence_sufficient_count" integer NOT NULL,
	"needs_review_count" integer NOT NULL,
	"solid_count" integer NOT NULL,
	"enrolled_count" integer NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_user_id" uuid NOT NULL,
	"course_section_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"normalized_error_type" text NOT NULL,
	"status" text NOT NULL,
	"confirmation_rule" text,
	"supporting_signal_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_spec_id" uuid NOT NULL,
	"course_section_id" uuid NOT NULL,
	"experience_key" text NOT NULL,
	"version" text NOT NULL,
	"title" text NOT NULL,
	"audience" text NOT NULL,
	"runtime_adapter" text DEFAULT 'declarative_decision_v1' NOT NULL,
	"generation_source" text NOT NULL,
	"definition" jsonb NOT NULL,
	"quality_review" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"status" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"launch_id" uuid,
	"experience_definition_id" uuid NOT NULL,
	"student_user_id" uuid NOT NULL,
	"course_section_id" uuid NOT NULL,
	"recommendation_id" uuid,
	"source_artifact_id" uuid,
	"status" text DEFAULT 'created' NOT NULL,
	"current_step_index" integer DEFAULT 0 NOT NULL,
	"last_sequence_no" integer DEFAULT -1 NOT NULL,
	"state" jsonb DEFAULT '{"answers":{},"hintsByStep":{},"revealedSteps":[]}'::jsonb NOT NULL,
	"result" jsonb,
	"is_simulated" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_section_id" uuid NOT NULL,
	"recommendation_id" uuid,
	"finding_id" uuid,
	"objective" text NOT NULL,
	"target_capability_ids" jsonb NOT NULL,
	"target_cognitive_level" text NOT NULL,
	"delivery_mode" text DEFAULT 'interactive_web' NOT NULL,
	"participation_scope" text DEFAULT 'individual' NOT NULL,
	"pedagogical_pattern" text NOT NULL,
	"target_error_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"teacher_instruction" text,
	"planner_version" text NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interpretation_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_user_id" uuid NOT NULL,
	"course_section_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"from_visible_state" text,
	"to_visible_state" text NOT NULL,
	"trigger_reason" text NOT NULL,
	"triggering_source_artifact_id" uuid,
	"snapshot" jsonb NOT NULL,
	"engine_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "launches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_definition_id" uuid NOT NULL,
	"course_section_id" uuid NOT NULL,
	"class_session_id" uuid,
	"status" text NOT NULL,
	"join_code" text NOT NULL,
	"opens_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closes_at" timestamp with time zone,
	"baseline" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "launches_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"course_section_id" uuid,
	"correlation_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" text NOT NULL,
	"user_id" uuid,
	"course_section_id" uuid,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_capabilities" (
	"recommendation_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"feedback_type" text NOT NULL,
	"reason_code" text,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"reason_code" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_actor" text NOT NULL,
	"target_scope_id" uuid NOT NULL,
	"course_section_id" uuid,
	"domain" text NOT NULL,
	"mode" text NOT NULL,
	"priority_class" text NOT NULL,
	"priority_band" text NOT NULL,
	"rank" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"objective" text NOT NULL,
	"reason_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"action_spec" jsonb NOT NULL,
	"explanation" jsonb NOT NULL,
	"status" text DEFAULT 'generated' NOT NULL,
	"context_hash" text NOT NULL,
	"superseded_by_id" uuid,
	"supersession_reason" text,
	"due_at" timestamp with time zone,
	"engine_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runtime_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"event_type" text NOT NULL,
	"step_id" text,
	"opportunity_id" text,
	"sequence_no" integer NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"schema_version" text NOT NULL,
	"sdk_version" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_finding_validations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finding_id" uuid NOT NULL,
	"teacher_user_id" uuid NOT NULL,
	"validation" text NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_section_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"finding_type" text NOT NULL,
	"headline" text NOT NULL,
	"detail" text NOT NULL,
	"rationale" jsonb NOT NULL,
	"priority" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_section_teachers" ADD CONSTRAINT "course_section_teachers_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_section_teachers" ADD CONSTRAINT "course_section_teachers_teacher_user_id_users_id_fk" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_memberships" ADD CONSTRAINT "institution_memberships_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_memberships" ADD CONSTRAINT "institution_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capabilities" ADD CONSTRAINT "capabilities_curriculum_version_id_curriculum_versions_id_fk" FOREIGN KEY ("curriculum_version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capabilities" ADD CONSTRAINT "capabilities_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capabilities" ADD CONSTRAINT "capabilities_node_id_curriculum_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."curriculum_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_prerequisites" ADD CONSTRAINT "capability_prerequisites_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_prerequisites" ADD CONSTRAINT "capability_prerequisites_prerequisite_capability_id_capabilities_id_fk" FOREIGN KEY ("prerequisite_capability_id") REFERENCES "public"."capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_nodes" ADD CONSTRAINT "curriculum_nodes_curriculum_version_id_curriculum_versions_id_fk" FOREIGN KEY ("curriculum_version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_nodes" ADD CONSTRAINT "curriculum_nodes_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_source_artifact_id_source_artifacts_id_fk" FOREIGN KEY ("source_artifact_id") REFERENCES "public"."source_artifacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_events" ADD CONSTRAINT "evidence_events_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_events" ADD CONSTRAINT "evidence_events_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_events" ADD CONSTRAINT "evidence_events_source_artifact_id_source_artifacts_id_fk" FOREIGN KEY ("source_artifact_id") REFERENCES "public"."source_artifacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_events" ADD CONSTRAINT "evidence_events_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_invalidations" ADD CONSTRAINT "evidence_invalidations_evidence_event_id_evidence_events_id_fk" FOREIGN KEY ("evidence_event_id") REFERENCES "public"."evidence_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_signals" ADD CONSTRAINT "evidence_signals_evidence_event_id_evidence_events_id_fk" FOREIGN KEY ("evidence_event_id") REFERENCES "public"."evidence_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_signals" ADD CONSTRAINT "evidence_signals_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_signals" ADD CONSTRAINT "evidence_signals_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_signals" ADD CONSTRAINT "evidence_signals_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_source_artifact_id_source_artifacts_id_fk" FOREIGN KEY ("source_artifact_id") REFERENCES "public"."source_artifacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_target_capability_id_capabilities_id_fk" FOREIGN KEY ("target_capability_id") REFERENCES "public"."capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_versions" ADD CONSTRAINT "profile_versions_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_interactions" ADD CONSTRAINT "raw_interactions_source_artifact_id_source_artifacts_id_fk" FOREIGN KEY ("source_artifact_id") REFERENCES "public"."source_artifacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_interactions" ADD CONSTRAINT "raw_interactions_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_interactions" ADD CONSTRAINT "raw_interactions_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_artifacts" ADD CONSTRAINT "source_artifacts_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_artifacts" ADD CONSTRAINT "source_artifacts_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_interpretations" ADD CONSTRAINT "capability_interpretations_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_interpretations" ADD CONSTRAINT "capability_interpretations_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_interpretations" ADD CONSTRAINT "capability_interpretations_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_feedback_summaries" ADD CONSTRAINT "class_feedback_summaries_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_feedback_summaries" ADD CONSTRAINT "class_feedback_summaries_class_session_id_class_sessions_id_fk" FOREIGN KEY ("class_session_id") REFERENCES "public"."class_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_capability_projection" ADD CONSTRAINT "classroom_capability_projection_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_capability_projection" ADD CONSTRAINT "classroom_capability_projection_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_capability_snapshots" ADD CONSTRAINT "classroom_capability_snapshots_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_capability_snapshots" ADD CONSTRAINT "classroom_capability_snapshots_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_patterns" ADD CONSTRAINT "error_patterns_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_patterns" ADD CONSTRAINT "error_patterns_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_patterns" ADD CONSTRAINT "error_patterns_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_definitions" ADD CONSTRAINT "experience_definitions_experience_spec_id_experience_specs_id_fk" FOREIGN KEY ("experience_spec_id") REFERENCES "public"."experience_specs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_definitions" ADD CONSTRAINT "experience_definitions_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_sessions" ADD CONSTRAINT "experience_sessions_launch_id_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."launches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_sessions" ADD CONSTRAINT "experience_sessions_experience_definition_id_experience_definitions_id_fk" FOREIGN KEY ("experience_definition_id") REFERENCES "public"."experience_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_sessions" ADD CONSTRAINT "experience_sessions_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_sessions" ADD CONSTRAINT "experience_sessions_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_sessions" ADD CONSTRAINT "experience_sessions_source_artifact_id_source_artifacts_id_fk" FOREIGN KEY ("source_artifact_id") REFERENCES "public"."source_artifacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_specs" ADD CONSTRAINT "experience_specs_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interpretation_history" ADD CONSTRAINT "interpretation_history_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interpretation_history" ADD CONSTRAINT "interpretation_history_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interpretation_history" ADD CONSTRAINT "interpretation_history_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "launches" ADD CONSTRAINT "launches_experience_definition_id_experience_definitions_id_fk" FOREIGN KEY ("experience_definition_id") REFERENCES "public"."experience_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "launches" ADD CONSTRAINT "launches_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "launches" ADD CONSTRAINT "launches_class_session_id_class_sessions_id_fk" FOREIGN KEY ("class_session_id") REFERENCES "public"."class_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "launches" ADD CONSTRAINT "launches_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_capabilities" ADD CONSTRAINT "recommendation_capabilities_recommendation_id_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_capabilities" ADD CONSTRAINT "recommendation_capabilities_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_recommendation_id_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_history" ADD CONSTRAINT "recommendation_history_recommendation_id_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_sources" ADD CONSTRAINT "recommendation_sources_recommendation_id_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runtime_events" ADD CONSTRAINT "runtime_events_session_id_experience_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."experience_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_finding_validations" ADD CONSTRAINT "teacher_finding_validations_finding_id_teacher_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."teacher_findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_finding_validations" ADD CONSTRAINT "teacher_finding_validations_teacher_user_id_users_id_fk" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_findings" ADD CONSTRAINT "teacher_findings_course_section_id_course_sections_id_fk" FOREIGN KEY ("course_section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_findings" ADD CONSTRAINT "teacher_findings_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "class_sessions_uq" ON "class_sessions" USING btree ("course_section_id","sequence_no");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_uq" ON "enrollments" USING btree ("course_section_id","student_user_id");--> statement-breakpoint
CREATE INDEX "enrollments_student_idx" ON "enrollments" USING btree ("student_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "institution_memberships_uq" ON "institution_memberships" USING btree ("institution_id","user_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "capabilities_key_uq" ON "capabilities" USING btree ("curriculum_version_id","stable_key");--> statement-breakpoint
CREATE INDEX "capabilities_section_idx" ON "capabilities" USING btree ("course_section_id","status");--> statement-breakpoint
CREATE INDEX "curriculum_nodes_tree_idx" ON "curriculum_nodes" USING btree ("curriculum_version_id","parent_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_versions_no_uq" ON "curriculum_versions" USING btree ("course_section_id","version_no");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_versions_active_uq" ON "curriculum_versions" USING btree ("course_section_id") WHERE status = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_events_dedupe_uq" ON "evidence_events" USING btree ("deduplication_key");--> statement-breakpoint
CREATE INDEX "evidence_signals_scope_idx" ON "evidence_signals" USING btree ("student_user_id","course_section_id","capability_id");--> statement-breakpoint
CREATE INDEX "raw_interactions_source_idx" ON "raw_interactions" USING btree ("source_artifact_id");--> statement-breakpoint
CREATE INDEX "source_artifacts_student_idx" ON "source_artifacts" USING btree ("student_user_id","course_section_id","created_at");--> statement-breakpoint
CREATE INDEX "source_artifacts_hash_idx" ON "source_artifacts" USING btree ("content_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "capability_interpretations_uq" ON "capability_interpretations" USING btree ("student_user_id","course_section_id","capability_id");--> statement-breakpoint
CREATE UNIQUE INDEX "classroom_capability_projection_pk" ON "classroom_capability_projection" USING btree ("course_section_id","capability_id");--> statement-breakpoint
CREATE UNIQUE INDEX "error_patterns_uq" ON "error_patterns" USING btree ("student_user_id","course_section_id","capability_id","normalized_error_type");--> statement-breakpoint
CREATE UNIQUE INDEX "experience_definitions_key_uq" ON "experience_definitions" USING btree ("experience_key","version");--> statement-breakpoint
CREATE INDEX "experience_sessions_student_idx" ON "experience_sessions" USING btree ("student_user_id","status");--> statement-breakpoint
CREATE INDEX "interpretation_history_scope_idx" ON "interpretation_history" USING btree ("student_user_id","course_section_id","capability_id");--> statement-breakpoint
CREATE INDEX "outbox_events_created_idx" ON "outbox_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recommendation_capabilities_uq" ON "recommendation_capabilities" USING btree ("recommendation_id","capability_id");--> statement-breakpoint
CREATE INDEX "recommendations_target_idx" ON "recommendations" USING btree ("target_actor","target_scope_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "runtime_events_idem_uq" ON "runtime_events" USING btree ("session_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "runtime_events_seq_uq" ON "runtime_events" USING btree ("session_id","sequence_no");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_findings_uq" ON "teacher_findings" USING btree ("course_section_id","capability_id","finding_type");