export type CreateAudioTrack = {
    readonly "input": CreateAudioTrack$input;
    readonly "result": CreateAudioTrack$result;
};

export type CreateAudioTrack$result = {
    readonly createAudioTrack: {
        readonly id: string;
        readonly composerId: string;
        readonly trackNumber: number;
        readonly trackType: string;
        readonly name: string | null;
        readonly createdAt: string;
        readonly updatedAt: string;
    };
};

type CreateAudioTrackInput = {
    composerId: string | number;
    trackNumber: number;
    trackType: string;
    name?: string | null | undefined;
};

export type CreateAudioTrack$input = {
    input: CreateAudioTrackInput;
};

export type CreateAudioTrack$optimistic = {
    readonly createAudioTrack?: {
        readonly id?: string;
        readonly composerId?: string;
        readonly trackNumber?: number;
        readonly trackType?: string;
        readonly name?: string | null;
        readonly createdAt?: string;
        readonly updatedAt?: string;
    };
};

export type CreateAudioTrack$artifact = {
    "name": "CreateAudioTrack";
    "kind": "HoudiniMutation";
    "hash": "94aedd7bde2dd57f069fbbf18b56b6a303834abc2e36f7164f727077707783b5";
    "raw": `mutation CreateAudioTrack($input: CreateAudioTrackInput!) {
  createAudioTrack(input: $input) {
    id
    composerId
    trackNumber
    trackType
    name
    createdAt
    updatedAt
  }
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "createAudioTrack": {
                "type": "AudioTrack";
                "keyRaw": "createAudioTrack(input: $input)";
                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID";
                            "keyRaw": "id";
                            "visible": true;
                        };
                        "composerId": {
                            "type": "ID";
                            "keyRaw": "composerId";
                            "visible": true;
                        };
                        "trackNumber": {
                            "type": "Int";
                            "keyRaw": "trackNumber";
                            "visible": true;
                        };
                        "trackType": {
                            "type": "String";
                            "keyRaw": "trackType";
                            "visible": true;
                        };
                        "name": {
                            "type": "String";
                            "keyRaw": "name";
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
            "input": "CreateAudioTrackInput";
        };
        "types": {
            "CreateAudioTrackInput": {
                "composerId": "ID";
                "trackNumber": "Int";
                "trackType": "String";
                "name": "String";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};