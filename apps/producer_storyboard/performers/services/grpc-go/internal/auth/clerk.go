package auth

import (
	"context"
	"strings"

	"connectrpc.com/connect"
)

// ClerkAuth represents the authentication context from Clerk
type ClerkAuth struct {
	UserID    string
	OrgID     string
	SessionID string
	Email     string
	FirstName string
	LastName  string
}

// contextKey is a custom type for context keys
type contextKey string

const (
	// AuthContextKey is the key used to store ClerkAuth in context
	AuthContextKey contextKey = "clerk_auth"
)

// GetAuthFromContext retrieves ClerkAuth from context
func GetAuthFromContext(ctx context.Context) *ClerkAuth {
	auth, ok := ctx.Value(AuthContextKey).(*ClerkAuth)
	if !ok {
		return &ClerkAuth{}
	}
	return auth
}

// GetOrgIDFromContext retrieves organization ID from context
func GetOrgIDFromContext(ctx context.Context) string {
	auth := GetAuthFromContext(ctx)
	return auth.OrgID
}

// GetUserIDFromContext retrieves user ID from context
func GetUserIDFromContext(ctx context.Context) string {
	auth := GetAuthFromContext(ctx)
	return auth.UserID
}

// RequireAuth returns the ClerkAuth from context or nil if not authenticated
func RequireAuth(ctx context.Context) *ClerkAuth {
	auth := GetAuthFromContext(ctx)
	if auth.UserID == "" {
		return nil
	}
	return auth
}

// RequireOrg returns the organization ID from context or empty string if not in org
func RequireOrg(ctx context.Context) string {
	auth := GetAuthFromContext(ctx)
	return auth.OrgID
}

// NewAuthInterceptor creates a Connect interceptor that extracts Clerk auth from headers
func NewAuthInterceptor() connect.UnaryInterceptorFunc {
	return func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
			auth := &ClerkAuth{}

			// Extract session ID from Authorization header
			authHeader := req.Header().Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				auth.SessionID = strings.TrimPrefix(authHeader, "Bearer ")
			}

			// Fallback to X-Clerk-Session header
			if auth.SessionID == "" {
				auth.SessionID = req.Header().Get("X-Clerk-Session")
			}

			// Extract organization ID from X-Org-Id header
			auth.OrgID = req.Header().Get("X-Org-Id")

			// Extract user ID from X-User-Id header (for testing/development)
			auth.UserID = req.Header().Get("X-User-Id")

			// Add auth to context
			ctx = context.WithValue(ctx, AuthContextKey, auth)

			return next(ctx, req)
		}
	}
}

