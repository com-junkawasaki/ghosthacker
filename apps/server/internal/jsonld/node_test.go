package jsonld

import (
	"testing"
)

func TestStr_FlatString(t *testing.T) {
	n := Wrap(map[string]interface{}{
		"dct:title": "Vol.1 Ch.2 — Nei-chanの朝",
	})
	got, ok := n.Str("dct:title")
	if !ok || got != "Vol.1 Ch.2 — Nei-chanの朝" {
		t.Errorf("Str(flat) = %q, %v", got, ok)
	}
}

func TestStr_BilingualObject(t *testing.T) {
	n := Wrap(map[string]interface{}{
		"gh:visual": map[string]interface{}{
			"en": "A single seed on dark damp earth.",
			"ja": "暗く湿った土に種が一粒。",
		},
	})
	got, ok := n.Str("gh:visual", "visual")
	if !ok || got != "A single seed on dark damp earth." {
		t.Errorf("Str(bilingual) = %q, %v", got, ok)
	}
}

func TestStr_FallbackKey(t *testing.T) {
	// Old format uses "visual" alias
	n := Wrap(map[string]interface{}{
		"visual": "朝食を食べ終えたTamakiが...",
	})
	got, ok := n.Str("gh:visual", "visual")
	if !ok || got != "朝食を食べ終えたTamakiが..." {
		t.Errorf("Str(fallback) = %q, %v", got, ok)
	}
}

func TestStr_Missing(t *testing.T) {
	n := Wrap(map[string]interface{}{})
	_, ok := n.Str("nonexistent")
	if ok {
		t.Error("Str(missing) should return false")
	}
}

func TestBilingual_FlatString(t *testing.T) {
	n := Wrap(map[string]interface{}{
		"visual": "A seed on dark earth.",
	})
	bt, ok := n.Bilingual("gh:visual", "visual")
	if !ok {
		t.Fatal("Bilingual(flat) should be ok")
	}
	if bt.En != "A seed on dark earth." || bt.Ja != "A seed on dark earth." {
		t.Errorf("Bilingual(flat) = %+v", bt)
	}
}

func TestBilingual_Object(t *testing.T) {
	n := Wrap(map[string]interface{}{
		"gh:visual": map[string]interface{}{
			"en": "A seed.",
			"ja": "種。",
		},
	})
	bt, ok := n.Bilingual("gh:visual", "visual")
	if !ok {
		t.Fatal("Bilingual(object) should be ok")
	}
	if bt.En != "A seed." || bt.Ja != "種。" {
		t.Errorf("Bilingual(object) = %+v", bt)
	}
}

func TestFloat_And_Int(t *testing.T) {
	n := Wrap(map[string]interface{}{
		"gh:pageNumber": float64(5),
	})
	f, ok := n.Float("gh:pageNumber")
	if !ok || f != 5.0 {
		t.Errorf("Float = %v, %v", f, ok)
	}
	i, ok := n.Int("gh:pageNumber")
	if !ok || i != 5 {
		t.Errorf("Int = %v, %v", i, ok)
	}
}

func TestSlice(t *testing.T) {
	n := Wrap(map[string]interface{}{
		"gh:panels": []interface{}{
			map[string]interface{}{"gh:panelIndex": float64(1)},
			map[string]interface{}{"gh:panelIndex": float64(2)},
		},
	})
	panels := n.Slice("gh:panels")
	if len(panels) != 2 {
		t.Fatalf("Slice len = %d, want 2", len(panels))
	}
	idx, ok := panels[0].Int32("gh:panelIndex", "panel")
	if !ok || idx != 1 {
		t.Errorf("panel[0].Int32 = %d, %v", idx, ok)
	}
}

func TestSlice_OldFormat(t *testing.T) {
	n := Wrap(map[string]interface{}{
		"gh:panels": []interface{}{
			map[string]interface{}{"panel": float64(1), "visual": "old style"},
		},
	})
	panels := n.Slice("gh:panels")
	if len(panels) != 1 {
		t.Fatalf("Slice len = %d", len(panels))
	}
	idx, ok := panels[0].Int32("gh:panelIndex", "panel")
	if !ok || idx != 1 {
		t.Errorf("panel.Int32(alias) = %d, %v", idx, ok)
	}
	vis, ok := panels[0].Str("gh:visual", "visual")
	if !ok || vis != "old style" {
		t.Errorf("panel.Str(alias) = %q, %v", vis, ok)
	}
}

func TestStringSlice(t *testing.T) {
	n := Wrap(map[string]interface{}{
		"characters": []interface{}{"character:tamaki", "character:nei"},
	})
	chars := n.StringSlice("gh:characters", "characters")
	if len(chars) != 2 || chars[0] != "character:tamaki" {
		t.Errorf("StringSlice = %v", chars)
	}
}

func TestMap(t *testing.T) {
	n := Wrap(map[string]interface{}{
		"gh:mangaLayout": map[string]interface{}{
			"panels": []interface{}{},
		},
	})
	child, ok := n.Map("gh:mangaLayout")
	if !ok {
		t.Error("Map should be ok")
	}
	_ = child
}

func TestWrap_Nil(t *testing.T) {
	n := Wrap(nil)
	_, ok := n.Str("anything")
	if ok {
		t.Error("Wrap(nil).Str should return false")
	}
}

func TestBilingualText_String(t *testing.T) {
	bt := BilingualText{En: "hello", Ja: "こんにちは"}
	if bt.String() != "hello" {
		t.Errorf("String() = %q", bt.String())
	}
	bt2 := BilingualText{Ja: "こんにちは"}
	if bt2.String() != "こんにちは" {
		t.Errorf("String() ja fallback = %q", bt2.String())
	}
}

func TestDialogue_NewFormat(t *testing.T) {
	n := Wrap(map[string]interface{}{
		"gh:dialogue": []interface{}{
			map[string]interface{}{
				"gh:speaker": "Tamaki",
				"en":         "Hi.",
				"ja":         "やあ。",
			},
		},
	})
	dialogues := n.Slice("gh:dialogue", "dialogue")
	if len(dialogues) != 1 {
		t.Fatalf("len = %d", len(dialogues))
	}
	speaker, _ := dialogues[0].Str("gh:speaker", "speaker")
	if speaker != "Tamaki" {
		t.Errorf("speaker = %q", speaker)
	}
	text, _ := dialogues[0].Str("en", "text")
	if text != "Hi." {
		t.Errorf("text = %q", text)
	}
}

func TestDialogue_OldFormat(t *testing.T) {
	n := Wrap(map[string]interface{}{
		"dialogue": []interface{}{
			map[string]interface{}{
				"speaker": "Tamaki",
				"text":    "ありがとね、いつも",
			},
		},
	})
	dialogues := n.Slice("gh:dialogue", "dialogue")
	if len(dialogues) != 1 {
		t.Fatalf("len = %d", len(dialogues))
	}
	speaker, _ := dialogues[0].Str("gh:speaker", "speaker")
	text, _ := dialogues[0].Str("text")
	if speaker != "Tamaki" || text != "ありがとね、いつも" {
		t.Errorf("old dialogue = %q / %q", speaker, text)
	}
}
