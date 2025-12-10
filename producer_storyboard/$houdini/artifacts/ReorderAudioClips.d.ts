export type ReorderAudioClips = {
    readonly "input": ReorderAudioClips$input;
    readonly "result": ReorderAudioClips$result;
};

export type ReorderAudioClips$result = {
    readonly reorderAudioClips: ({
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
    })[];
};

export type ReorderAudioClips$input = {
    trackId: string | number;
    clipIds: (string | number)[];
};

export type ReorderAudioClips$optimistic = {
    readonly reorderAudioClips?: ({
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
    })[];
};

export type ReorderAudioClips$artifact = {
    "name": "ReorderAudioClips";
    "kind": "HoudiniMutation";
    "hash": "46a75d5190c4e59e04c08caf86592493c2054449f2c95bb88fb62ff600e9ae0e";
    "raw": `mutation ReorderAudioClips($trackId: ID!, $clipIds: [ID!]!) {
  reorderAudioClips(trackId: $trackId, clipIds: $clipIds) {
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
            "reorderAudioClips": {
                "type": "AudioClip";
                "keyRaw": "reorderAudioClips(clipIds: $clipIds, trackId: $trackId)";
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
            "trackId": "ID";
            "clipIds": "ID";
        };
        "types": {};
        "defaults": {};
        "runtimeScalars": {};
    };
};