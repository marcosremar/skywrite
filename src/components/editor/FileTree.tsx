"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoreVertical, Edit2, Copy, Trash2, FilePlus } from "lucide-react";
import type { ProjectFile } from "@prisma/client";

interface FileTreeProps {
  files: ProjectFile[];
  selectedFile: ProjectFile | null;
  onSelect: (file: ProjectFile) => void;
  projectId: string;
  onFileCreated?: (file: ProjectFile) => void;
  onFileDeleted?: (fileId: string) => void;
  onFileRenamed?: (file: ProjectFile) => void;
}

export function FileTree({
  files,
  selectedFile,
  onSelect,
  projectId,
  onFileCreated,
  onFileDeleted,
  onFileRenamed,
}: FileTreeProps) {
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null);
  const [referencesDialogOpen, setReferencesDialogOpen] = useState(false);
  const [referencingFiles, setReferencingFiles] = useState<string[]>([]);
  const [pendingRename, setPendingRename] = useState<{
    file: ProjectFile;
    newName: string;
  } | null>(null);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileDir, setNewFileDir] = useState("");
  const [newFileNameInput, setNewFileNameInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing
  useEffect(() => {
    if (editingFileId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingFileId]);

  // Group files by directory
  const groupedFiles = files.reduce(
    (acc, file) => {
      const parts = file.path.split("/");
      const dir = parts.length > 1 ? parts[0] : "root";
      if (!acc[dir]) acc[dir] = [];
      acc[dir].push(file);
      return acc;
    },
    {} as Record<string, ProjectFile[]>
  );

  const getFileIcon = (file: ProjectFile) => {
    switch (file.type) {
      case "MARKDOWN":
        return "📝";
      case "YAML":
        return "⚙️";
      case "BIBTEX":
        return "📚";
      case "IMAGE":
        return "🖼️";
      default:
        return "📄";
    }
  };

  const getDirIcon = (dir: string) => {
    switch (dir) {
      case "chapters":
        return "📖";
      case "structure":
        return "📋";
      case "appendices":
        return "📎";
      case "bibliography":
        return "📚";
      case "media":
        return "🖼️";
      default:
        return "📁";
    }
  };

  // Check if any other files reference this file
  const findReferencingFiles = (filePath: string): string[] => {
    const fileName = filePath.split("/").pop() || "";
    const referencingFilePaths: string[] = [];

    files.forEach((file) => {
      if (file.path === filePath) return;
      if (!file.content) return;

      // Check for references in markdown files
      if (file.content.includes(fileName) || file.content.includes(filePath)) {
        referencingFilePaths.push(file.path);
      }
    });

    return referencingFilePaths;
  };

  const handleStartRename = (file: ProjectFile) => {
    setEditingFileId(file.id);
    setNewFileName(file.name);
  };

  const handleDoubleClick = (file: ProjectFile) => {
    handleStartRename(file);
  };

  const handleRenameSubmit = async (file: ProjectFile) => {
    if (!newFileName.trim() || newFileName === file.name) {
      setEditingFileId(null);
      return;
    }

    // Check for references
    const refs = findReferencingFiles(file.path);
    if (refs.length > 0) {
      setReferencingFiles(refs);
      setPendingRename({ file, newName: newFileName });
      setReferencesDialogOpen(true);
      setEditingFileId(null);
      return;
    }

    await executeRename(file, newFileName);
  };

  const executeRename = async (
    file: ProjectFile,
    newName: string,
    updateReferences = false
  ) => {
    try {
      const parts = file.path.split("/");
      parts[parts.length - 1] = newName;
      const newPath = parts.join("/");

      const response = await fetch(
        `/api/projects/${projectId}/files/rename`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldPath: file.path, newPath, updateReferences }),
        }
      );

      if (response.ok) {
        const { file: updatedFile } = await response.json();
        onFileRenamed?.(updatedFile);
      }
    } catch (error) {
      console.error("Error renaming file:", error);
    } finally {
      setEditingFileId(null);
      setPendingRename(null);
      setReferencesDialogOpen(false);
    }
  };

  const handleDelete = async (file: ProjectFile) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!fileToDelete) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/files/${encodeURIComponent(fileToDelete.path)}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        onFileDeleted?.(fileToDelete.id);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
    } finally {
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const handleDuplicate = async (file: ProjectFile) => {
    try {
      const parts = file.path.split("/");
      const fileName = parts.pop() || "";
      const ext = fileName.includes(".") ? fileName.split(".").pop() : "";
      const baseName = ext
        ? fileName.slice(0, -(ext.length + 1))
        : fileName;
      const newFileName = ext ? `${baseName}-copia.${ext}` : `${baseName}-copia`;
      parts.push(newFileName);
      const newPath = parts.join("/");

      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: newPath,
          content: file.content,
          type: file.type,
        }),
      });

      if (response.ok) {
        const { file: newFile } = await response.json();
        onFileCreated?.(newFile);
      }
    } catch (error) {
      console.error("Error duplicating file:", error);
    }
  };

  const handleCreateFile = async () => {
    if (!newFileNameInput.trim()) {
      setIsCreatingFile(false);
      return;
    }

    const path = newFileDir
      ? `${newFileDir}/${newFileNameInput}`
      : newFileNameInput;

    try {
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          content: "",
          type: newFileNameInput.endsWith(".md")
            ? "MARKDOWN"
            : newFileNameInput.endsWith(".bib")
              ? "BIBTEX"
              : newFileNameInput.endsWith(".yaml") ||
                  newFileNameInput.endsWith(".yml")
                ? "YAML"
                : "OTHER",
        }),
      });

      if (response.ok) {
        const { file } = await response.json();
        onFileCreated?.(file);
      }
    } catch (error) {
      console.error("Error creating file:", error);
    } finally {
      setIsCreatingFile(false);
      setNewFileNameInput("");
      setNewFileDir("");
    }
  };

  const startCreateFile = (dir: string) => {
    setNewFileDir(dir === "root" ? "" : dir);
    setNewFileNameInput("");
    setIsCreatingFile(true);
  };

  return (
    <>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {Object.entries(groupedFiles).map(([dir, dirFiles]) => (
            <div key={dir} className="mb-2">
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  {dir !== "root" ? (
                    <div className="flex items-center justify-between gap-1 px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-accent rounded-md cursor-pointer group">
                      <div className="flex items-center gap-1">
                        <span>{getDirIcon(dir)}</span>
                        <span>{dir}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          startCreateFile(dir);
                        }}
                      >
                        <FilePlus className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-0" />
                  )}
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => startCreateFile(dir)}>
                    <FilePlus className="h-4 w-4 mr-2" />
                    Novo arquivo
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>

              {isCreatingFile && newFileDir === (dir === "root" ? "" : dir) && (
                <div className="px-3 py-1">
                  <Input
                    autoFocus
                    placeholder="nome-do-arquivo.md"
                    value={newFileNameInput}
                    onChange={(e) => setNewFileNameInput(e.target.value)}
                    onBlur={handleCreateFile}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFile();
                      if (e.key === "Escape") {
                        setIsCreatingFile(false);
                        setNewFileNameInput("");
                      }
                    }}
                    className="h-7 text-sm"
                  />
                </div>
              )}

              {dirFiles.map((file) => (
                <ContextMenu key={file.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      onClick={() => onSelect(file)}
                      onDoubleClick={() => handleDoubleClick(file)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left cursor-pointer group",
                        selectedFile?.id === file.id &&
                          "bg-accent text-accent-foreground font-medium"
                      )}
                    >
                      <span>{getFileIcon(file)}</span>
                      {editingFileId === file.id ? (
                        <Input
                          ref={inputRef}
                          value={newFileName}
                          onChange={(e) => setNewFileName(e.target.value)}
                          onBlur={() => handleRenameSubmit(file)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameSubmit(file);
                            if (e.key === "Escape") setEditingFileId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-6 text-sm py-0 px-1"
                        />
                      ) : (
                        <>
                          <span className="truncate flex-1">{file.name}</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => handleStartRename(file)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Renomear
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(file)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(file)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleStartRename(file)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Renomear
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleDuplicate(file)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicar
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => handleDelete(file)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{" "}
              <strong>{fileToDelete?.name}</strong>? Esta acao nao pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* References warning dialog */}
      <Dialog open={referencesDialogOpen} onOpenChange={setReferencesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arquivo referenciado</DialogTitle>
            <DialogDescription>
              Este arquivo e referenciado nos seguintes arquivos:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ul className="list-disc pl-4 space-y-1">
              {referencingFiles.map((path) => (
                <li key={path} className="text-sm text-muted-foreground">
                  {path}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setReferencesDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (pendingRename) {
                  executeRename(
                    pendingRename.file,
                    pendingRename.newName,
                    false
                  );
                }
              }}
            >
              Renomear apenas
            </Button>
            <Button
              onClick={() => {
                if (pendingRename) {
                  executeRename(
                    pendingRename.file,
                    pendingRename.newName,
                    true
                  );
                }
              }}
            >
              Atualizar referencias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
