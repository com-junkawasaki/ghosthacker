export type UpdateAudioClip = {
    readonly "input": UpdateAudioClip$input;
    readonly "result": UpdateAudioClip$result;
};

export type UpdateAudioClip$result = {
    readonly updateAudioClip: {
        readonly id: string;
        readonly trackId: string;
        readonly startTimeSeconds: number;
        readonly durationSeconds: number;
        readonly audioType: string;
        readonly audioUrl: string | null;
        readonly audioDataId: string | null;
        readonly metadata: string | null;
        readonly createdAt: string;
        readonly updatedAt: string;
    };
};

type UpdateAudioClipInput = {
    id: string | number;
    startTimeSeconds?: number | null | undefined;
    durationSeconds?: number | null | undefined;
    trackId?: string | number | null | undefined;
};

export type UpdateAudioClip$input = {
    input: UpdateAudioClipInput;
};

export type UpdateAudioClip$optimistic = {
    readonly updateAudioClip?: {
        readonly id?: string;
        readonly trackId?: string;
        readonly startTimeSeconds?: number;
        readonly durationSeconds?: number;
        readonly audioType?: string;
        readonly audioUrl?: string | null;
        readonly audioDataId?: string | null;
        readonly metadata?: string | null;
        readonly createdAt?: string;
        readonly updatedAt?: string;
    };
};

export type UpdateAudioClip$artifact = {
    "name": "UpdateAudioClip";
    "kind": "HoudiniMutation";
    "hash": "402963906082bd853e95abd6676b59ce3e50164255cf6059b9706b27584c79a1";
    "raw": `mutation UpdateAudioClip($input: UpdateAudioClipInput!) {
  updateAudioClip(input: $input) {
    id
    trackId
    startTimeSeconds
    durationSeconds
    audioType
    audioUrl
    audioDataId
    metadata
    createdAt
    updatedAt
  }
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "updateAudioClip": {
                "type": "AudioClip";
                "keyRaw": "updateAudioClip(input: $input)";
                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID";
                            "keyRaw": "id";
                            "visible": true;
                        };
                        "trackId": {
                            "type": "ID";
                            "keyRaw": "trackId";
                            "visible": true;
                        };
                        "startTimeSeconds": {
                            "type": "Float";
                            "keyRaw": "startTimeSeconds";
                            "visible": true;
                        };
                        "durationSeconds": {
                            "type": "Float";
                            "keyRaw": "durationSeconds";
                            "visible": true;
                        };
                        "audioType": {
                            "type": "String";
                            "keyRaw": "audioType";
                            "visible": true;
                        };
                        "audioUrl": {
                            "type": "String";
                            "keyRaw": "audioUrl";
                            "nullable": true;
                            "visible": true;
                        };
                        "audioDataId": {
                            "type": "ID";
                            "keyRaw": "audioDataId";
                            "nullable": true;
                            "visible": true;
                        };
                        "metadata": {
                            "type": "String";
                            "keyRaw": "metadata";
                            "nullable": true;
                            "visible": true;
                        };
                        "createdAt": {
                            "type": "String";
                            "keyRaw": "createdAt";
                            "visible": true;
                        };
                        "updatedAt": {
                            "type": "String";
                            "keyRaw": "updatedAt";
                            "visible": true;
                        };
                    };
                };
                "visible": true;
            };
        };
    };
    "pluginData": {
        "houdini-svelte": {};
    };
    "input": {
        "fields": {
            "input": "UpdateAudioClipInput";
        };
        "types": {
            "UpdateAudioClipInput": {
                "id": "ID";
                "startTimeSeconds": "Float";
                "durationSeconds": "Float";
                "trackId": "ID";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};