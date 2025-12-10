export default {
    "name": "DeleteAudioClip",
    "kind": "HoudiniMutation",
    "hash": "635c6fb3de3f4b8cfa122124411f9d472525ef6260bb530c8961a1de25fe0f62",

    "raw": `mutation DeleteAudioClip($id: ID!) {
  deleteAudioClip(id: $id)
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "deleteAudioClip": {
                "type": "Boolean",
                "keyRaw": "deleteAudioClip(id: $id)",
                "visible": true
            }
        }
    },

    "pluginData": {
        "houdini-svelte": {}
    },

    "input": {
        "fields": {
            "id": "ID"
        },

        "types": {},
        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=9e30f18b6e86609d9be9a3e587ee6ceeb4964d4d1dea955b198abe8e08c55755";