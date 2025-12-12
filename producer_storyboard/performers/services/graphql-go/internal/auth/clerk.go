package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
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

// ExtractAuth extracts Clerk authentication info from HTTP request headers
func ExtractAuth(r *http.Request) *ClerkAuth {
	auth := &ClerkAuth{}

	// Extract session ID from Authorization header
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		auth.SessionID = strings.TrimPrefix(authHeader, "Bearer ")
	}

	// Fallback to X-Clerk-Session header
	if auth.SessionID == "" {
		auth.SessionID = r.Header.Get("X-Clerk-Session")
	}

	// Extract organization ID from X-Org-Id header
	auth.OrgID = r.Header.Get("X-Org-Id")

	// Extract user ID from X-User-Id header (for testing/development)
	auth.UserID = r.Header.Get("X-User-Id")

	return auth
}

// GetAuthFromContext retrieves ClerkAuth from context
func GetAuthFromContext(ctx context.Context) *ClerkAuth {
	auth, ok := ctx.Value(AuthContextKey).(*ClerkAuth)
	if !ok {
		return &ClerkAuth{}
	}
	return auth
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

// Middleware wraps an HTTP handler with authentication extraction
func Middleware(pool *pgxpool.Pool, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := ExtractAuth(r)

		// Add auth to request context
		ctx := context.WithValue(r.Context(), AuthContextKey, auth)

		// Continue with updated context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
