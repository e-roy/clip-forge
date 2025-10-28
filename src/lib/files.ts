import * as path from "path";
import * as fs from "fs";

/**
 * Makes an absolute path relative to a project directory.
 * @param projectDir The project directory (where .cforge file is)
 * @param assetPath The absolute path to the asset
 * @returns A relative path from projectDir to assetPath
 */
export function makeRelativePath(
  projectDir: string,
  assetPath: string
): string {
  try {
    return path.relative(projectDir, assetPath);
  } catch (error) {
    console.error("Failed to make path relative:", error);
    return assetPath;
  }
}

/**
 * Resolves a relative path to an absolute path based on project directory.
 * If the path is already absolute, it's returned as-is.
 * @param projectDir The project directory (where .cforge file is)
 * @param relativePath The relative or absolute path
 * @returns An absolute path
 */
export function resolveAssetPath(
  projectDir: string,
  relativePath: string
): string {
  // If path is already absolute, return it
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }

  try {
    const resolved = path.resolve(projectDir, relativePath);

    // Verify the resolved path exists
    if (fs.existsSync(resolved)) {
      return resolved;
    }

    console.warn(`Resolved path does not exist: ${resolved}`);
    return resolved;
  } catch (error) {
    console.error("Failed to resolve asset path:", error);
    return relativePath;
  }
}

/**
 * Normalizes a project file path to always use forward slashes for cross-platform compatibility.
 */
export function normalizeProjectPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}
