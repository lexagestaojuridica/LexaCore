import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
    Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
    AlignLeft, AlignCenter, AlignRight, Heading1, Heading2,
    Quote, Undo, Redo, Sparkles
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    variables?: string[];
    onInsertVariable?: (variable: string) => void;
}

const MenuBar = ({ editor, variables, onInsertVariable }: { editor: any, variables?: string[], onInsertVariable?: (v: string) => void }) => {
    if (!editor) return null;

    return (
        <div className="flex flex-wrap items-center gap-1 border-b border-border p-2 bg-muted/20 sticky top-0 z-20 backdrop-blur-sm">
            <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0", editor.isActive('bold') && "bg-muted text-primary")}
                onClick={() => editor.chain().focus().toggleBold().run()}
            >
                <Bold className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0", editor.isActive('italic') && "bg-muted text-primary")}
                onClick={() => editor.chain().focus().toggleItalic().run()}
            >
                <Italic className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0", editor.isActive('underline') && "bg-muted text-primary")}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
                <UnderlineIcon className="h-4 w-4" />
            </Button>

            <div className="w-[1px] h-6 bg-border mx-1" />

            <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0", editor.isActive('heading', { level: 1 }) && "bg-muted text-primary")}
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
                <Heading1 className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0", editor.isActive('heading', { level: 2 }) && "bg-muted text-primary")}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
                <Heading2 className="h-4 w-4" />
            </Button>

            <div className="w-[1px] h-6 bg-border mx-1" />

            <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0", editor.isActive('bulletList') && "bg-muted text-primary")}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
                <List className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0", editor.isActive('orderedList') && "bg-muted text-primary")}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
                <ListOrdered className="h-4 w-4" />
            </Button>

            <div className="w-[1px] h-6 bg-border mx-1" />

            <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: 'left' }) && "bg-muted text-primary")}
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
            >
                <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: 'center' }) && "bg-muted text-primary")}
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
            >
                <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: 'right' }) && "bg-muted text-primary")}
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
            >
                <AlignRight className="h-4 w-4" />
            </Button>

            <div className="flex-1" />

            {variables && variables.length > 0 && (
                <div className="flex items-center gap-1.5 ml-2 border-l pl-3 border-border">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Variáveis:</span>
                    {variables.map(v => (
                        <Button
                            key={v}
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2 bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                            onClick={() => {
                                editor.chain().focus().insertContent(` {{${v}}} `).run();
                            }}
                        >
                            {v}
                        </Button>
                    ))}
                </div>
            )}

            <div className="w-[1px] h-6 bg-border mx-1" />

            <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => editor.chain().focus().undo().run()}
            >
                <Undo className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => editor.chain().focus().redo().run()}
            >
                <Redo className="h-4 w-4" />
            </Button>
        </div>
    );
};

export default function RichTextEditor({ content, onChange, placeholder, variables }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content: content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-6 text-foreground font-serif',
            },
        },
    });

    return (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col group focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <MenuBar editor={editor} variables={variables} />
            <EditorContent editor={editor} />
            <div className="p-2 bg-muted/5 border-t border-border flex justify-between items-center px-4">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> Use Variáveis Mágicas para preenchimento automático
                </span>
                <span className="text-[10px] text-muted-foreground">
                    {editor?.storage.characterCount?.characters() || 0} caracteres
                </span>
            </div>
        </div>
    );
}
