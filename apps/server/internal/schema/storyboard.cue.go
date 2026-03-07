package schema

import (
	"cuelang.org/go/cue"
	"cuelang.org/go/cue/cuecontext"
)

const StoryboardSchema = `
#Context: {
	gh: "https://ghosthacker.gftd.ai/ns/"
	schema: "http://schema.org/"
	dct: "http://purl.org/dc/terms/"
	prov: "http://www.w3.org/ns/prov#"
	character?: "gh:character/"
	arc?: "gh:arc/"
	panel?: "gh:panelIndex"
	purpose?: "gh:narrativePurpose"
	shot?: "gh:shotType"
	prompt?: "gh:runwayPrompt"
	properties?: "gh:shotProperties"
	episodeId?: "gh:episodeId"
	episodeIndex?: "gh:episodeIndex"
	characters?: "gh:characters"
	dialogue?: "gh:dialogue"
	speaker?: "gh:speaker"
	text?: "gh:text"
	visual?: "gh:visual"
	env?: "gh:environment/"
	environment?: "gh:environment"
	environments?: "gh:environments"
	marginalia?: string
	...
}

// BilingualText: either a flat string or an {en, ja} object
#BilingualText: string | { en: string, ja?: string } | { en?: string, ja: string }

// Dialogue in storyboard (old) format
#Dialogue: {
	speaker?: string
	"gh:speaker"?: string
	text?:    string
	en?: string
	ja?: string
	"gh:delivery"?: string
	"gh:subtext"?: string
	"gh:emotion"?: string
	"gh:pauseBeforeMs"?: int
	"gh:pauseAfterMs"?: int
	...
}

// Caption (graphic novel format)
#Caption: {
	"gh:type"?: string
	en?: string
	ja?: string
	...
}

#ShotProperties: {
	"gh:atmosphere": string
	"gh:composition": string
	"gh:lighting": string
	"gh:distance": string
	"gh:lens": string
	"gh:aperture": string
	"gh:focus": string
	"gh:angle": string
	"gh:eyeDetail"?: string
}

// StoryboardPanel: old format with flat string fields and @context aliases
#StoryboardPanel: {
	panel: int
	shot: string
	"gh:shotProperties": #ShotProperties
	"gh:runwayPrompt": string
	visual: string
	environment: string
	characters: [...string]
	dialogue: [...#Dialogue]
	"gh:durationSeconds"?: float
	"gh:cutNumber"?: string
	"gh:cameraDirection"?: string
	"generatedImageUrl"?: string
	"gh:generatedImageUrl"?: string
	"gh:imagePrompt"?: string
	"gh:generatedImages"?: [...#GeneratedImage]
	"gh:currentImageIndex"?: int
	...
}

// GraphicNovelPanel: new format with gh: prefixed keys and bilingual text
#GraphicNovelPanel: {
	"gh:panelIndex"?: int
	"gh:shot"?: string
	"gh:visual"?: #BilingualText
	"gh:dialogue"?: [...#Dialogue]
	"gh:caption"?: [...#Caption]
	"gh:neiCaption"?: [...#Caption]
	"gh:systemCaption"?: [...#Caption]
	"gh:characters"?: [...string]
	"gh:imagePrompt"?: string
	"gh:generatedImageUrl"?: string
	"gh:generatedImages"?: [...#GeneratedImage]
	"gh:currentImageIndex"?: int
	...
}

#GeneratedImage: {
	"gh:imageUrl": string
	"gh:imagePrompt": string
	"gh:generatedAt": number
	"gh:model": string
	...
}

// Panel: union of both formats
#Panel: #StoryboardPanel | #GraphicNovelPanel

#Page: {
	"gh:pageNumber": int
	"gh:label"?: string
	"gh:layout"?: string
	"gh:continues"?: int
	"gh:act"?: string
	"gh:pageBeat"?: {
		"gh:emotionalShift"?: string
		"gh:hook"?: string
		"gh:tempo"?: string
		"gh:turn"?: string
		...
	}
	"gh:panels": [...#Panel]
	marginalia?: [...]
	...
}

#Countermeasure: {
	"gh:step": int
	"gh:title": string
	"gh:titleEn"?: string
	"gh:pages": [int, int]
}

#ActStructure: {
	"@id": string
	"gh:actNumber": int
	"gh:actTitle": string
	"gh:actTitleEn"?: string
	"gh:pageRange": [int, int]
	"gh:emotionalArc"?: string
	"gh:narrativePurpose"?: string
	"gh:keyBeat"?: string
	"gh:sourceFile"?: string
	"gh:countermeasures"?: [...#Countermeasure]
	...
}

#Act: {
	"@context"?: _
	"@id": string
	"@type"?: [...string]
	"gh:actNumber": int
	"gh:actTitle": string
	"gh:actTitleEn"?: string
	"gh:pageRange": [int, int]
	"gh:emotionalArc"?: string
	"gh:narrativePurpose"?: string
	"gh:keyBeat"?: string
	"gh:countermeasures"?: [...#Countermeasure]
	"gh:pages": [...#Page]
	...
}

#Episode: {
	"gh:episode"?: int
	"gh:episodeIndex"?: int
	"gh:episodeId": string
	"dct:title": #BilingualText
	"dct:title_en"?: string
	"dct:title_ja"?: string
	"gh:presentationTagline"?: string
	"gh:arc": string
	"gh:format"?: string
	"gh:sourceFile"?: string
	"gh:industry"?: string
	"gh:mainCharacter"?: string
	"gh:supportingCharacters"?: [...string]
	"gh:realCase"?: string
	"gh:sinContrast"?: string
	"gh:nistFocus"?: [...string]
	"gh:incidentDescription"?: string
	"gh:actStructure"?: [...#ActStructure]
	"gh:pages"?: [...#Page]
	"gh:marginalia"?: [...]
	"gh:artDirection"?: _
	"gh:bookDesign"?: _
	"gh:series"?: _
	...
}

#Storyboard: {
	"@context": #Context
	"@id": string
	"@type": [...string]
	"dct:title": string
	"dct:description": string
	"gh:globalStyle": string
	"gh:runwayConstraints": string
	"prov:wasDerivedFrom": [...{ "@id": string }]
	"gh:directingGuide"?: _
	"gh:meta": {
		"gh:oneLiner": string
		"gh:hook": string
		"gh:audience": string
		"gh:tags": [...string]
		...
	}
	"gh:environments": [...{
		"@id": string
		"dct:title": string
		"dct:description": string
		...
	}]
	"gh:characters": [...{
		"@id": string
		"schema:name": string
		"dct:description": string
		"gh:voice"?: _
		...
	}]
	"gh:episodes": [...#Episode]
	...
}

root: #Storyboard
`

func GetSchema() cue.Value {
	ctx := cuecontext.New()
	return ctx.CompileString(StoryboardSchema)
}
