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

"HoudiniHash=ea8172132411390ba2ab5a8d2704cb98c8d3e19e8053ccae59540dbb885d1b5c";