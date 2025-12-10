export type DeleteAudioClip = {
    readonly "input": DeleteAudioClip$input;
    readonly "result": DeleteAudioClip$result;
};

export type DeleteAudioClip$result = {
    readonly deleteAudioClip: boolean;
};

export type DeleteAudioClip$input = {
    id: string | number;
};

export type DeleteAudioClip$optimistic = {
    readonly deleteAudioClip?: boolean;
};

export type DeleteAudioClip$artifact = {
    "name": "DeleteAudioClip";
    "kind": "HoudiniMutation";
    "hash": "635c6fb3de3f4b8cfa122124411f9d472525ef6260bb530c8961a1de25fe0f62";
    "raw": `mutation DeleteAudioClip($id: ID!) {
  deleteAudioClip(id: $id)
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "deleteAudioClip": {
                "type": "Boolean";
                "keyRaw": "deleteAudioClip(id: $id)";
                "visible": true;
            };
        };
    };
    "pluginData": {
        "houdini-svelte": {};
    };
    "input": {
        "fields": {
            "id": "ID";
        };
        "types": {};
        "defaults": {};
        "runtimeScalars": {};
    };
};