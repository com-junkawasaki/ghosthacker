package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

// ClerkService handles Clerk API interactions
type ClerkService struct {
	secretKey string
	baseURL   string
	client    *http.Client
}

// ClerkOrganizationMember represents a member in a Clerk organization
type ClerkOrganizationMember struct {
	ID             string `json:"id"`
	Object         string `json:"object"`
	Role           string `json:"role"`
	CreatedAt      int64  `json:"created_at"`
	UpdatedAt      int64  `json:"updated_at"`
	OrganizationID string `json:"organization_id"`
	PublicUserData struct {
		UserID    string `json:"user_id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		ImageURL  string `json:"image_url"`
	} `json:"public_user_data"`
}

// ClerkOrganizationMemberList represents the response from listing organization members
type ClerkOrganizationMemberList struct {
	Data       []ClerkOrganizationMember `json:"data"`
	TotalCount int                       `json:"total_count"`
}

// ClerkUser represents a Clerk user
type ClerkUser struct {
	ID             string `json:"id"`
	Object         string `json:"object"`
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
	ImageURL       string `json:"image_url"`
	PrimaryEmailID string `json:"primary_email_address_id"`
	EmailAddresses []struct {
		ID           string `json:"id"`
		EmailAddress string `json:"email_address"`
	} `json:"email_addresses"`
}

// NewClerkService creates a new Clerk service
func NewClerkService() (*ClerkService, error) {
	secretKey := os.Getenv("CLERK_SECRET_KEY")
	if secretKey == "" {
		return nil, fmt.Errorf("CLERK_SECRET_KEY environment variable is required")
	}

	return &ClerkService{
		secretKey: secretKey,
		baseURL:   "https://api.clerk.com/v1",
		client:    &http.Client{},
	}, nil
}

// ListOrganizationMembers lists all members of an organization
func (s *ClerkService) ListOrganizationMembers(orgID string) ([]ClerkOrganizationMember, error) {
	url := fmt.Sprintf("%s/organizations/%s/memberships", s.baseURL, orgID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.secretKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var result ClerkOrganizationMemberList
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return result.Data, nil
}

// GetUser gets a user by ID
func (s *ClerkService) GetUser(userID string) (*ClerkUser, error) {
	url := fmt.Sprintf("%s/users/%s", s.baseURL, userID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.secretKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var user ClerkUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &user, nil
}

// TeamMemberInfo represents team member info extracted from Clerk
type TeamMemberInfo struct {
	UserID    string
	Name      string
	Email     string
	AvatarURL string
}

// GetOrganizationMembersInfo fetches all organization members with their details
func (s *ClerkService) GetOrganizationMembersInfo(orgID string) ([]TeamMemberInfo, error) {
	members, err := s.ListOrganizationMembers(orgID)
	if err != nil {
		return nil, err
	}

	var result []TeamMemberInfo
	for _, member := range members {
		user, err := s.GetUser(member.PublicUserData.UserID)
		if err != nil {
			// Log error but continue with available data
			result = append(result, TeamMemberInfo{
				UserID:    member.PublicUserData.UserID,
				Name:      fmt.Sprintf("%s %s", member.PublicUserData.FirstName, member.PublicUserData.LastName),
				AvatarURL: member.PublicUserData.ImageURL,
			})
			continue
		}

		email := ""
		for _, e := range user.EmailAddresses {
			if e.ID == user.PrimaryEmailID {
				email = e.EmailAddress
				break
			}
		}
		if email == "" && len(user.EmailAddresses) > 0 {
			email = user.EmailAddresses[0].EmailAddress
		}

		result = append(result, TeamMemberInfo{
			UserID:    user.ID,
			Name:      fmt.Sprintf("%s %s", user.FirstName, user.LastName),
			Email:     email,
			AvatarURL: user.ImageURL,
		})
	}

	return result, nil
}
