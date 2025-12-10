export type CreateAudioClip = {
    readonly "input": CreateAudioClip$input;
    readonly "result": CreateAudioClip$result;
};

export type CreateAudioClip$result = {
    readonly createAudioClip: {
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

type CreateAudioClipInput = {
    trackId: string | number;
    startTimeSeconds: number;
    durationSeconds: number;
    audioType: string;
    audioUrl?: string | null | undefined;
    audioDataId?: string | number | null | undefined;
    metadata?: string | null | undefined;
};

export type CreateAudioClip$input = {
    input: CreateAudioClipInput;
};

export type CreateAudioClip$optimistic = {
    readonly createAudioClip?: {
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

export type CreateAudioClip$artifact = {
    "name": "CreateAudioClip";
    "kind": "HoudiniMutation";
    "hash": "4739ea8fe08b26c393c3cac6cd751d78463543dd27fec8231d048da410ade4e8";
    "raw": `mutation CreateAudioClip($input: CreateAudioClipInput!) {
  createAudioClip(input: $input) {
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
            "createAudioClip": {
                "type": "AudioClip";
                "keyRaw": "createAudioClip(input: $input)";
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
            "input": "CreateAudioClipInput";
        };
        "types": {
            "CreateAudioClipInput": {
                "trackId": "ID";
                "startTimeSeconds": "Float";
                "durationSeconds": "Float";
                "audioType": "String";
                "audioUrl": "String";
                "audioDataId": "ID";
                "metadata": "String";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};