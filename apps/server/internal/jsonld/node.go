package jsonld

// Node wraps a map[string]interface{} from JSON-LD data and provides safe
// accessors that try multiple key aliases, handling both flat strings and
// bilingual {en, ja} objects transparently.
type Node struct {
	data map[string]interface{}
}

// BilingualText holds text that may exist in multiple languages.
type BilingualText struct {
	En string
	Ja string
}

// String returns the English text, or Ja if En is empty.
func (bt BilingualText) String() string {
	if bt.En != "" {
		return bt.En
	}
	return bt.Ja
}

// IsZero returns true if both En and Ja are empty.
func (bt BilingualText) IsZero() bool {
	return bt.En == "" && bt.Ja == ""
}

// Wrap creates a Node from a map. Returns a zero Node if data is nil.
func Wrap(data map[string]interface{}) Node {
	if data == nil {
		data = map[string]interface{}{}
	}
	return Node{data: data}
}

// Raw returns the underlying map.
func (n Node) Raw() map[string]interface{} {
	return n.data
}

// Get returns the raw value for the first matching key.
func (n Node) Get(keys ...string) (interface{}, bool) {
	for _, k := range keys {
		if v, ok := n.data[k]; ok {
			return v, true
		}
	}
	return nil, false
}

// Str returns a string value, trying each key in order.
// If the value is a bilingual object {en, ja}, it returns the English text
// (or Japanese if English is empty).
func (n Node) Str(keys ...string) (string, bool) {
	v, ok := n.Get(keys...)
	if !ok {
		return "", false
	}
	return coerceString(v)
}

// Bilingual returns a BilingualText, trying each key in order.
// Handles both flat strings and {en, ja} objects.
func (n Node) Bilingual(keys ...string) (BilingualText, bool) {
	v, ok := n.Get(keys...)
	if !ok {
		return BilingualText{}, false
	}
	return coerceBilingual(v)
}

// Float returns a float64 value, trying each key in order.
func (n Node) Float(keys ...string) (float64, bool) {
	v, ok := n.Get(keys...)
	if !ok {
		return 0, false
	}
	switch val := v.(type) {
	case float64:
		return val, true
	case int:
		return float64(val), true
	case int64:
		return float64(val), true
	default:
		return 0, false
	}
}

// Int returns an int value, trying each key in order.
func (n Node) Int(keys ...string) (int, bool) {
	f, ok := n.Float(keys...)
	if !ok {
		return 0, false
	}
	return int(f), true
}

// Int32 returns an int32 value, trying each key in order.
func (n Node) Int32(keys ...string) (int32, bool) {
	f, ok := n.Float(keys...)
	if !ok {
		return 0, false
	}
	return int32(f), true
}

// Float32 returns a float32 value, trying each key in order.
func (n Node) Float32(keys ...string) (float32, bool) {
	f, ok := n.Float(keys...)
	if !ok {
		return 0, false
	}
	return float32(f), true
}

// Bool returns a bool value, trying each key in order.
func (n Node) Bool(keys ...string) (bool, bool) {
	v, ok := n.Get(keys...)
	if !ok {
		return false, false
	}
	b, ok := v.(bool)
	return b, ok
}

// Map returns a child Node for the first matching key.
func (n Node) Map(keys ...string) (Node, bool) {
	v, ok := n.Get(keys...)
	if !ok {
		return Node{data: map[string]interface{}{}}, false
	}
	m, ok := v.(map[string]interface{})
	if !ok {
		return Node{data: map[string]interface{}{}}, false
	}
	return Wrap(m), true
}

// Slice returns child Nodes for the first matching key that holds []interface{}.
func (n Node) Slice(keys ...string) []Node {
	v, ok := n.Get(keys...)
	if !ok {
		return nil
	}
	arr, ok := v.([]interface{})
	if !ok {
		return nil
	}
	nodes := make([]Node, 0, len(arr))
	for _, item := range arr {
		if m, ok := item.(map[string]interface{}); ok {
			nodes = append(nodes, Wrap(m))
		}
	}
	return nodes
}

// StringSlice returns a []string for the first matching key.
func (n Node) StringSlice(keys ...string) []string {
	v, ok := n.Get(keys...)
	if !ok {
		return nil
	}
	arr, ok := v.([]interface{})
	if !ok {
		return nil
	}
	result := make([]string, 0, len(arr))
	for _, item := range arr {
		if s, ok := item.(string); ok {
			result = append(result, s)
		}
	}
	return result
}

// BilingualSlice returns a slice of BilingualText for arrays of bilingual objects.
func (n Node) BilingualSlice(keys ...string) []BilingualText {
	v, ok := n.Get(keys...)
	if !ok {
		return nil
	}
	arr, ok := v.([]interface{})
	if !ok {
		return nil
	}
	result := make([]BilingualText, 0, len(arr))
	for _, item := range arr {
		bt, ok := coerceBilingual(item)
		if ok {
			result = append(result, bt)
		}
	}
	return result
}

// coerceString extracts a string from a value that may be a string or {en, ja} map.
func coerceString(v interface{}) (string, bool) {
	switch val := v.(type) {
	case string:
		return val, true
	case map[string]interface{}:
		// Bilingual object: prefer English
		if en, ok := val["en"].(string); ok && en != "" {
			return en, true
		}
		if ja, ok := val["ja"].(string); ok && ja != "" {
			return ja, true
		}
		return "", false
	default:
		return "", false
	}
}

// coerceBilingual extracts a BilingualText from a string or {en, ja} map.
func coerceBilingual(v interface{}) (BilingualText, bool) {
	switch val := v.(type) {
	case string:
		return BilingualText{En: val, Ja: val}, true
	case map[string]interface{}:
		bt := BilingualText{}
		bt.En, _ = val["en"].(string)
		bt.Ja, _ = val["ja"].(string)
		return bt, !bt.IsZero()
	default:
		return BilingualText{}, false
	}
}
