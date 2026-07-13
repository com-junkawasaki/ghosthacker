package service

import (
	"os"
	"strings"
	"testing"
)

// Exercises validateAndLoad's shelled-out nbb/kotoba-lang-spec validator
// (the CUE replacement, ADR-2607131400 addendum) end-to-end — requires nbb
// on PATH and kotoba-lang/spec checked out at the default relative
// location (or KOTOBA_SPEC_SRC override). Skips rather than fails if nbb
// isn't available, since CI/dev environments without the JS toolchain
// shouldn't hard-fail a Go test suite on a cross-language dependency.

// The validator's env-var defaults assume the SERVER's own cwd is
// apps/server (its usual run location); `go test` instead runs from this
// package's own directory (apps/server/internal/service), so tests set
// both overrides explicitly — but only when not already set by the caller
// (e.g. a west checkout at a non-canonical worktree path during CI/dev,
// which needs absolute-path overrides of its own).
func setValidatorEnv(t *testing.T) {
	t.Helper()
	if os.Getenv("GHOSTHACKER_VALIDATOR_SCRIPT") == "" {
		t.Setenv("GHOSTHACKER_VALIDATOR_SCRIPT", "../../scripts/validate_storyboard.cljs")
	}
	if os.Getenv("KOTOBA_SPEC_SRC") == "" {
		t.Setenv("KOTOBA_SPEC_SRC", "../../../../../../kotoba-lang/spec/src")
	}
}

func TestValidateAndLoad_Valid(t *testing.T) {
	setValidatorEnv(t)
	svc := &StoryboardService{}
	data, err := svc.validateAndLoad("testdata/storyboard-valid.json")
	if err != nil {
		if strings.Contains(err.Error(), "nbb on PATH") {
			t.Skip("nbb not available:", err)
		}
		t.Fatalf("expected valid storyboard to pass, got: %v", err)
	}
	if data["dct:title"] != "Test Storyboard" {
		t.Errorf("expected parsed data to round-trip dct:title, got: %v", data["dct:title"])
	}
}

func TestValidateAndLoad_Invalid(t *testing.T) {
	setValidatorEnv(t)
	svc := &StoryboardService{}
	_, err := svc.validateAndLoad("testdata/storyboard-invalid.json")
	if err == nil {
		t.Fatal("expected invalid storyboard (missing dct:title, wrong pageNumber type) to fail validation")
	}
	if strings.Contains(err.Error(), "nbb on PATH") {
		t.Skip("nbb not available:", err)
	}
	if !strings.Contains(err.Error(), "validation failed") {
		t.Errorf("expected a validation-failed error, got: %v", err)
	}
}
