"use server";

import fs from 'node:fs/promises';

export async function testContainers() {
    const files = await fs.readdir('.', {
        withFileTypes: true,
    });

    return files.map((entity) => {
        if (entity.isDirectory()) {
            return { type: 'directory', path: entity.parentPath, name: entity.name };
        }

        return { type: 'file', path: entity.parentPath, name: entity.name };
    })
}