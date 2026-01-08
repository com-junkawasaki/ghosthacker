package git

import (
	"fmt"
	"os/exec"
	"time"
)

type GitService struct {
	RepoPath string
}

func NewGitService(path string) *GitService {
	return &GitService{RepoPath: path}
}

func (s *GitService) CommitDocument(filePath string, message string) error {
	// 1. Git Add
	addCmd := exec.Command("git", "add", filePath)
	addCmd.Dir = s.RepoPath
	if err := addCmd.Run(); err != nil {
		return fmt.Errorf("git add failed: %w", err)
	}

	// 2. Git Commit
	commitMsg := fmt.Sprintf("%s (Auto-commit by Zen Editor at %s)", message, time.Now().Format(time.RFC3339))
	commitCmd := exec.Command("git", "commit", "-m", commitMsg)
	commitCmd.Dir = s.RepoPath
	if err := commitCmd.Run(); err != nil {
		// If there are no changes, git commit returns an error. We might want to ignore it.
		return nil 
	}

	return nil
}

