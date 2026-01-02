"use client";

import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    IconButton,
    Card,
    CardContent,
    Checkbox,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
} from "@mui/material";
import {
    AddCircle,
    CheckCircle,
    Description,
    Edit,
    Note,
    Delete,
    DeleteForever,
} from "@mui/icons-material";
import { usePsvStore } from "@/store/usePsvStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Comment, TodoItem, ProjectNote } from "@/data/types";
import { getUserById, users } from "@/data/mockData";
import { DeleteConfirmDialog } from '../shared/DeleteConfirmDialog';

export function NotesTab() {
    const {
        selectedPsv,
        todoList,
        commentList,
        noteList,
        addTodo,
        deleteTodo,
        softDeleteTodo,
        toggleTodo,
        updateTodo,
        addComment,
        deleteComment,
        softDeleteComment,
        updateComment,
        addNote,
        updateNote,
        deleteNote,
        softDeleteNote,
    } = usePsvStore();
    const canEdit = useAuthStore((state) => state.canEdit());
    const currentUser = useAuthStore((state) => state.currentUser);

    const [addTaskOpen, setAddTaskOpen] = useState(false);
    const [addCommentOpen, setAddCommentOpen] = useState(false);
    const [addNoteOpen, setAddNoteOpen] = useState(false);
    const [editCommentOpen, setEditCommentOpen] = useState(false);
    const [editNoteOpen, setEditNoteOpen] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskAssignee, setNewTaskAssignee] = useState(selectedPsv?.ownerId || '');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newCommentText, setNewCommentText] = useState('');
    const [newNoteText, setNewNoteText] = useState('');
    const [editCommentText, setEditCommentText] = useState('');
    const [editNoteText, setEditNoteText] = useState('');
    const [editTaskOpen, setEditTaskOpen] = useState(false);
    const [editTaskText, setEditTaskText] = useState('');
    const [editTaskAssignee, setEditTaskAssignee] = useState('');
    const [editTaskDueDate, setEditTaskDueDate] = useState('');
    const [editingComment, setEditingComment] = useState<Comment | null>(null);
    const [editingNote, setEditingNote] = useState<ProjectNote | null>(null);
    const [editingTask, setEditingTask] = useState<TodoItem | null>(null);

    if (!selectedPsv) return null;

    const filteredTodos = todoList.filter(t => t.protectiveSystemId === selectedPsv.id && t.isActive !== false);
    const filteredComments = commentList.filter(c => c.protectiveSystemId === selectedPsv.id && c.isActive !== false);
    const filteredNotes = noteList.filter(n => n.protectiveSystemId === selectedPsv.id && n.isActive !== false);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteItem, setDeleteItem] = useState<{ id: string; type: 'todo' | 'comment' | 'note'; name: string } | null>(null);

    const handleDeleteClick = (id: string, type: 'todo' | 'comment' | 'note', name: string) => {
        setDeleteItem({ id, type, name });
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteItem) return;
        const { id, type } = deleteItem;
        if (type === 'todo') await softDeleteTodo(id);
        else if (type === 'comment') await softDeleteComment(id);
        else if (type === 'note') await softDeleteNote(id);
        setDeleteDialogOpen(false);
        setDeleteItem(null);
    };

    const handleForceDelete = async () => {
        if (!deleteItem) return;
        const { id, type } = deleteItem;
        if (type === 'todo') await deleteTodo(id);
        else if (type === 'comment') await deleteComment(id);
        else if (type === 'note') await deleteNote(id);
        setDeleteDialogOpen(false);
        setDeleteItem(null);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleAddTask = () => {
        if (!newTaskText.trim()) return;
        const defaultDueDate = new Date();
        defaultDueDate.setDate(defaultDueDate.getDate() + 7);
        const dueDate = newTaskDueDate || defaultDueDate.toISOString().split('T')[0];

        const newTodo: TodoItem = {
            id: `todo-${Date.now()}`,
            protectiveSystemId: selectedPsv.id,
            text: newTaskText.trim(),
            completed: false,
            assignedTo: newTaskAssignee,
            dueDate: dueDate,
            createdBy: selectedPsv.ownerId,
            createdAt: new Date().toISOString(),
            isActive: true,
        };
        addTodo(newTodo);
        setNewTaskText('');
        setNewTaskAssignee(selectedPsv.ownerId);
        setNewTaskDueDate('');
        setAddTaskOpen(false);
    };

    const handleDeleteTodo = (id: string, text: string) => {
        handleDeleteClick(id, 'todo', text);
    };

    const handleStartEditTask = (todo: TodoItem) => {
        setEditingTask(todo);
        setEditTaskText(todo.text);
        setEditTaskAssignee(todo.assignedTo || selectedPsv.ownerId);
        setEditTaskDueDate(todo.dueDate || '');
        setEditTaskOpen(true);
    };

    const handleUpdateTask = () => {
        if (!editingTask || !editTaskText.trim() || !updateTodo) return;
        updateTodo(editingTask.id, {
            text: editTaskText.trim(),
            assignedTo: editTaskAssignee,
            dueDate: editTaskDueDate || undefined,
        });
        setEditTaskOpen(false);
        setEditingTask(null);
        setEditTaskText('');
        setEditTaskAssignee(selectedPsv.ownerId);
        setEditTaskDueDate('');
    };

    const handleAddComment = () => {
        if (!newCommentText.trim()) return;
        const creatorId = currentUser?.id || selectedPsv.ownerId;
        const newComment: Comment = {
            id: `comment-${Date.now()}`,
            protectiveSystemId: selectedPsv.id,
            body: newCommentText.trim(),
            createdBy: creatorId,
            createdAt: new Date().toISOString(),
            isActive: true,
        };
        addComment(newComment);
        setNewCommentText('');
        setAddCommentOpen(false);
    };

    const handleStartEditComment = (comment: Comment) => {
        setEditingComment(comment);
        setEditCommentText(comment.body);
        setEditCommentOpen(true);
    };

    const handleUpdateComment = () => {
        if (!editingComment || !editCommentText.trim()) return;
        updateComment(editingComment.id, {
            body: editCommentText.trim(),
            updatedBy: currentUser?.id || selectedPsv.ownerId,
            updatedAt: new Date().toISOString(),
        });
        setEditCommentOpen(false);
        setEditingComment(null);
        setEditCommentText('');
    };

    const handleDeleteComment = (id: string, text: string) => {
        handleDeleteClick(id, 'comment', text);
    };

    const handleAddNote = () => {
        if (!newNoteText.trim()) return;
        const creatorId = currentUser?.id || selectedPsv.ownerId;
        addNote({
            id: `note-${Date.now()}`,
            protectiveSystemId: selectedPsv.id,
            body: newNoteText.trim(),
            createdBy: creatorId,
            createdAt: new Date().toISOString(),
            isActive: true,
        });
        setNewNoteText('');
        setAddNoteOpen(false);
    };

    const handleStartEditNote = (note: ProjectNote) => {
        setEditingNote(note);
        setEditNoteText(note.body);
        setEditNoteOpen(true);
    };

    const handleUpdateNote = () => {
        if (!editingNote || !editNoteText.trim()) return;
        updateNote(editingNote.id, {
            body: editNoteText.trim(),
            updatedBy: currentUser?.id || selectedPsv.ownerId,
            updatedAt: new Date().toISOString(),
        });
        setEditNoteOpen(false);
        setEditingNote(null);
        setEditNoteText('');
    };

    const handleDeleteNote = (id: string, text: string) => {
        handleDeleteClick(id, 'note', text);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                        Tasks
                    </Typography>
                    {canEdit && (
                        <Button variant="contained" startIcon={<AddCircle />} size="small" onClick={() => setAddTaskOpen(true)}>
                            Add Task
                        </Button>
                    )}
                </Box>

                {filteredTodos.length > 0 ? (
                    <Paper variant="outlined">
                        <List disablePadding>
                            {filteredTodos.map((todo, index) => {
                                const assignee = todo.assignedTo ? getUserById(todo.assignedTo) : null;
                                return (
                                    <ListItem
                                        key={todo.id}
                                        divider={index < filteredTodos.length - 1}
                                        secondaryAction={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {todo.dueDate && (
                                                    <Chip
                                                        label={formatDate(todo.dueDate)}
                                                        size="small"
                                                        color={new Date(todo.dueDate) < new Date() && !todo.completed ? 'error' : 'default'}
                                                        variant="outlined"
                                                    />
                                                )}
                                                {canEdit && (
                                                    <>
                                                        <IconButton
                                                            edge="end"
                                                            aria-label="edit"
                                                            onClick={() => handleStartEditTask(todo)}
                                                        >
                                                            <Edit />
                                                        </IconButton>
                                                        <IconButton
                                                            edge="end"
                                                            aria-label="delete"
                                                            onClick={() => handleDeleteTodo(todo.id, todo.text)}
                                                        >
                                                            <Delete />
                                                        </IconButton>
                                                    </>
                                                )}
                                            </Box>
                                        }
                                    >
                                        <ListItemIcon>
                                            <Checkbox
                                                checked={todo.completed}
                                                onChange={() => toggleTodo(todo.id)}
                                            />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Typography sx={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
                                                    {todo.text}
                                                </Typography>
                                            }
                                            secondary={assignee ? `Assigned to ${assignee.name}` : undefined}
                                        />
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Paper>
                ) : (
                    <Paper variant="outlined" sx={{ py: 4, textAlign: 'center' }}>
                        <CheckCircle sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">No tasks</Typography>
                    </Paper>
                )}
            </Box>

            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box>
                        <Typography variant="h6" fontWeight={600}>
                            Notes
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            These appear on the printable summary.
                        </Typography>
                    </Box>
                    {canEdit && (
                        <Button variant="contained" startIcon={<AddCircle />} size="small" onClick={() => setAddNoteOpen(true)}>
                            Add Note
                        </Button>
                    )}
                </Box>

                {filteredNotes.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {filteredNotes.map((note) => {
                            const author = getUserById(note.updatedBy || note.createdBy);
                            const timestamp = note.updatedAt || note.createdAt;
                            return (
                                <Card
                                    key={note.id}
                                    variant="outlined"
                                    sx={{
                                        borderColor: 'success.main',
                                        backgroundColor: (theme) => theme.palette.mode === 'dark'
                                            ? 'rgba(34, 197, 94, 0.08)'
                                            : 'rgba(34, 197, 94, 0.12)',
                                    }}
                                >
                                    <CardContent sx={{ pb: '16px !important' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                                            <Box>
                                                <Typography fontWeight={600}>
                                                    {note.body}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {author?.name || 'Unknown'}, {new Date(timestamp).toLocaleDateString()}
                                                </Typography>
                                            </Box>
                                            {canEdit && (
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    <IconButton size="small" onClick={() => handleStartEditNote(note)}>
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => handleDeleteNote(note.id, note.body.slice(0, 30) + "...")}>
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>
                ) : (
                    <Paper variant="outlined" sx={{ py: 4, textAlign: 'center' }}>
                        <Description sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">No notes</Typography>
                    </Paper>
                )}
            </Box>

            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                        Comments
                    </Typography>
                    {canEdit && (
                        <Button variant="contained" startIcon={<AddCircle />} size="small" onClick={() => setAddCommentOpen(true)}>
                            Add Comment
                        </Button>
                    )}
                </Box>

                {filteredComments.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {filteredComments.map((comment) => {
                            const author = getUserById(comment.updatedBy || comment.createdBy);
                            const timestamp = comment.updatedAt || comment.createdAt;
                            return (
                                <Card key={comment.id} variant="outlined">
                                    <CardContent sx={{ pb: '16px !important' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                                            <Box>
                                                <Typography fontWeight={600}>
                                                    {comment.body}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {author?.name || 'Unknown'}, {formatDate(timestamp)}
                                                </Typography>
                                            </Box>
                                            {canEdit && (
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    <IconButton size="small" onClick={() => handleStartEditComment(comment)}>
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => handleDeleteComment(comment.id, comment.body.slice(0, 30) + "...")}>
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>
                ) : (
                    <Paper variant="outlined" sx={{ py: 4, textAlign: 'center' }}>
                        <Note sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">No comments</Typography>
                    </Paper>
                )}
            </Box>

            <Dialog open={addTaskOpen} onClose={() => setAddTaskOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Task</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Task description"
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        sx={{ mt: 2, mb: 2 }}
                    />
                    <TextField
                        select
                        fullWidth
                        label="Assign to"
                        value={newTaskAssignee}
                        onChange={(e) => setNewTaskAssignee(e.target.value)}
                        sx={{ mb: 2 }}
                        SelectProps={{ native: true }}
                    >
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.name}
                            </option>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        type="date"
                        label="Due date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{
                            '& input::-webkit-calendar-picker-indicator': {
                                filter: (theme) =>
                                    theme.palette.mode === 'dark'
                                        ? 'invert(0.8)'
                                        : 'invert(0.2)',
                                opacity: 0.9,
                            },
                        }}
                        helperText="Default: 1 week from today"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddTaskOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddTask} disabled={!newTaskText.trim()}>
                        Add
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={addCommentOpen} onClose={() => setAddCommentOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Comment</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={3}
                        label="Comment"
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddCommentOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddComment} disabled={!newCommentText.trim()}>
                        Add
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={editTaskOpen} onClose={() => setEditTaskOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Task description"
                        value={editTaskText}
                        onChange={(e) => setEditTaskText(e.target.value)}
                        sx={{ mt: 2, mb: 2 }}
                    />
                    <TextField
                        select
                        fullWidth
                        label="Assign to"
                        value={editTaskAssignee}
                        onChange={(e) => setEditTaskAssignee(e.target.value)}
                        sx={{ mb: 2 }}
                        SelectProps={{ native: true }}
                    >
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.name}
                            </option>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        type="date"
                        label="Due date"
                        value={editTaskDueDate}
                        onChange={(e) => setEditTaskDueDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{
                            '& input::-webkit-calendar-picker-indicator': {
                                filter: (theme) =>
                                    theme.palette.mode === 'dark'
                                        ? 'invert(0.8)'
                                        : 'invert(0.2)',
                                opacity: 0.9,
                            },
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditTaskOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleUpdateTask} disabled={!editTaskText.trim()}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={editCommentOpen} onClose={() => setEditCommentOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Comment</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={3}
                        label="Comment"
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditCommentOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleUpdateComment} disabled={!editCommentText.trim()}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={addNoteOpen} onClose={() => setAddNoteOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>New Note</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={4}
                        label="Formal note"
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        sx={{ mt: 1 }}
                        helperText="Displayed on the printable summary"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddNoteOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddNote} disabled={!newNoteText.trim()}>
                        Save Note
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={editNoteOpen} onClose={() => setEditNoteOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Note</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={4}
                        label="Note"
                        value={editNoteText}
                        onChange={(e) => setEditNoteText(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditNoteOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleUpdateNote} disabled={!editNoteText.trim()}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                onForceDelete={handleForceDelete}
                allowForceDelete={canEdit}
                title={`Deactivate ${deleteItem?.type || 'item'}`}
                itemName={deleteItem?.name || ''}
            />
        </Box>
    );
}
