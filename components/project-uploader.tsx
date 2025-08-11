"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { FileText, UploadCloud, Eye, Trash2 } from "lucide-react";

type InitialFile = {
  name: string;
  size: number;
  uploadedAt: string; // ISO string
};

export type ProjectUploaderProps = {
  initialFiles?: InitialFile[];
  projectId: string;
  onFilesChange?: (files: FileRecord[]) => void;
};

type FileRecord = {
  id: string;
  name: string;
  size: number;
  uploadedAt: Date;
  file?: File;
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${
    sizes[i]
  }`;
}

function timeSince(date: Date) {
  return formatDistanceToNow(date, { addSuffix: true });
}

export function ProjectUploader({
  initialFiles = [],
  projectId,
  onFilesChange,
}: ProjectUploaderProps) {
  const [files, setFiles] = useState<FileRecord[]>(
    initialFiles.map((f, idx) => ({
      id: String(idx + 1),
      name: f.name,
      size: f.size,
      uploadedAt: new Date(f.uploadedAt),
    }))
  );
  const [uploading, setUploading] = useState(false);
  const idRef = useRef(files.length);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FileRecord | null>(null);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/projects/${projectId}/files`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    return response.json();
  };

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (!accepted?.length) return;

      setUploading(true);
      try {
        for (const file of accepted) {
          const result = await uploadFile(file);
          if (result.success) {
            setFiles((prev) => {
              const newFiles = [
                ...prev,
                {
                  id: result.file.id,
                  name: result.file.name,
                  size: result.file.size,
                  uploadedAt: new Date(result.file.uploadedAt),
                },
              ];
              onFilesChange?.(newFiles);
              return newFiles;
            });
          }
        }
      } catch (error) {
        console.error("Upload error:", error);
        // TODO: Show error toast
      } finally {
        setUploading(false);
      }
    },
    [projectId, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "text/plain": [".txt"],
    },
    multiple: true,
  });

  const dropzoneClasses = useMemo(
    () =>
      [
        "rounded-lg border-2 border-dashed p-8 sm:p-10 transition-colors",
        isDragActive
          ? "border-primary/60 bg-primary/5"
          : "border-muted-foreground/25",
      ].join(" "),
    [isDragActive]
  );

  function requestDelete(rec: FileRecord) {
    setPendingDelete(rec);
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/files?fileId=${pendingDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setFiles((prev) => {
          const newFiles = prev.filter((f) => f.id !== pendingDelete.id);
          onFilesChange?.(newFiles);
          return newFiles;
        });
      }
    } catch (error) {
      console.error("Delete error:", error);
      // TODO: Show error toast
    }

    setConfirmOpen(false);
    setPendingDelete(null);
  }

  async function viewDocument(file: FileRecord) {
    try {
      // Get file details from the API
      const response = await fetch(`/api/projects/${projectId}/files`);
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      console.log('Looking for file ID:', file.id);
      
      const fileDetails = data.files.find((f: any) => f.id === file.id);
      console.log('Found file details:', fileDetails);
      
      if (fileDetails && fileDetails.filePath) {
        console.log('Opening file path:', fileDetails.filePath);
        // Open the blob URL directly
        window.open(fileDetails.filePath, '_blank');
      } else {
        console.error('File not found or no file path available');
        console.error('Available files:', data.files.map((f: any) => ({ id: f.id, name: f.name, filePath: f.filePath })));
      }
    } catch (error) {
      console.error('Error viewing document:', error);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
      {/* Upload Card - Left Side */}
      <Card>
        <CardHeader>
          <CardTitle>Document Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <div {...getRootProps({ className: dropzoneClasses })}>
            <input {...getInputProps()} aria-label="Upload project documents" />
            <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
                <UploadCloud className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {isDragActive
                    ? "Drop the files here…"
                    : "Drag & drop files here"}
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse
                </p>
              </div>
              <Button
                variant="secondary"
                type="button"
                onClick={open}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Choose Files"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Documents - Right Side */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Uploaded Documents</CardTitle>
            <CardDescription>
              {files.length} {files.length === 1 ? "file" : "files"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {files.length === 0 ? (
            <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
              No files uploaded yet.
            </div>
          ) : (
            files.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatBytes(f.size)} • Uploaded {timeSince(new Date(f.uploadedAt))}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`View ${f.name}`}
                    onClick={() => viewDocument(f)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${f.name}`}
                    onClick={() => requestDelete(f)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? (
                <>
                  You are about to delete{" "}
                  <span className="font-medium">{pendingDelete.name}</span>.
                  This action cannot be undone.
                </>
              ) : (
                "This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
