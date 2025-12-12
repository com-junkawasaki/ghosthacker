package service

import (
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// Helper functions to convert pgtype to Go types

func pgUUIDToString(id pgtype.UUID) string {
	if !id.Valid {
		return ""
	}
	return uuid.UUID(id.Bytes).String()
}

func pgUUIDToUUID(id pgtype.UUID) uuid.UUID {
	if !id.Valid {
		return uuid.Nil
	}
	return id.Bytes
}

func uuidToPgUUID(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

func pgTextToString(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}

func stringToPgText(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: *s, Valid: true}
}

func pgTimestamptzToTime(t pgtype.Timestamptz) time.Time {
	if !t.Valid {
		return time.Time{}
	}
	return t.Time
}

func pgTimestamptzToString(t pgtype.Timestamptz) string {
	if !t.Valid {
		return time.Time{}.Format(time.RFC3339)
	}
	return t.Time.Format(time.RFC3339)
}

func pgFloat8ToFloat64(f pgtype.Float8) *float64 {
	if !f.Valid {
		return nil
	}
	return &f.Float64
}

func float64ToPgFloat8(f *float64) pgtype.Float8 {
	if f == nil {
		return pgtype.Float8{Valid: false}
	}
	return pgtype.Float8{Float64: *f, Valid: true}
}

func pgInt4ToInt32(i pgtype.Int4) *int32 {
	if !i.Valid {
		return nil
	}
	v := int32(i.Int32)
	return &v
}

func int32ToPgInt4(i *int32) pgtype.Int4 {
	if i == nil {
		return pgtype.Int4{Valid: false}
	}
	return pgtype.Int4{Int32: *i, Valid: true}
}

func pgNumericToFloat64(n pgtype.Numeric) *float64 {
	if !n.Valid {
		return nil
	}
	// Convert Numeric to float64
	f, _ := n.Float64Value()
	if f.Valid {
		return &f.Float64
	}
	return nil
}

func float64ToPgNumeric(f *float64) pgtype.Numeric {
	if f == nil {
		return pgtype.Numeric{Valid: false}
	}
	// Convert float64 to Numeric
	n := pgtype.Numeric{}
	n.Scan(*f)
	return n
}

func stringPtr(s string) *string {
	return &s
}

func int32Ptr(i int32) *int32 {
	return &i
}
