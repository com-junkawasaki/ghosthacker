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
	character: "gh:character/"
	arc: "gh:arc/"
	panel: "gh:panelIndex"
	purpose: "gh:narrativePurpose"
	shot: "gh:shotType"
	prompt: "gh:runwayPrompt"
	properties: "gh:shotProperties"
	episodeId: "gh:episodeId"
	episodeIndex: "gh:episodeIndex"
	characters: "gh:characters"
	dialogue: "gh:dialogue"
	speaker: "gh:speaker"
	text: "gh:text"
	visual: "gh:visual"
	env: "gh:environment/"
	environment: "gh:environment"
	environments: "gh:environments"
	...
}

#Dialogue: {
	speaker: string
	text:    string
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

#Panel: {
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
}

#Page: {
	"gh:pageNumber": int
	"gh:panels": [...#Panel]
}

#Episode: {
	"gh:episode": int
	"gh:episodeIndex": int
	"gh:episodeId": string
	"dct:title": string
	"gh:presentationTagline": string
	"gh:arc": string
	"gh:industry": string
	"gh:mainCharacter": string
	"gh:supportingCharacters": [...string]
	"gh:realCase": string
	"gh:sinContrast": string
	"gh:nistFocus": [...string]
	"gh:incidentDescription": string
	"gh:pages": [...#Page]
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
	"gh:meta": {
		"gh:oneLiner": string
		"gh:hook": string
		"gh:audience": string
		"gh:tags": [...string]
	}
	"gh:environments": [...{
		"@id": string
		"dct:title": string
		"dct:description": string
	}]
	"gh:characters": [...{
		"@id": string
		"schema:name": string
		"dct:description": string
	}]
	"gh:episodes": [...#Episode]
}

root: #Storyboard
`

func GetSchema() cue.Value {
	ctx := cuecontext.New()
	return ctx.CompileString(StoryboardSchema)
}
