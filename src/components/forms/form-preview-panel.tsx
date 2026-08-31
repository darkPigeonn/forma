import { FormFillPreview } from "@/components/form-fill/form-fill-preview";
import { FormHeaderBanner } from "@/components/forms/form-header-banner";
import { formThemeStyle, resolveFormTheme } from "@/lib/form-theme";
import type { FormThemeId } from "@/lib/form-constants";
import type { FormHeaderImageMeta } from "@/lib/storage/form-header";
import type { QuestionInput, SectionInput } from "@/lib/validators/question";
import { ui } from "@/lib/ui-id";

type FormPreviewPanelProps = {
  title: string;
  description: string;
  questions: QuestionInput[];
  sections: SectionInput[];
  themeId: FormThemeId;
  headerImage?: FormHeaderImageMeta | null;
};

export function FormPreviewPanel({
  title,
  description,
  questions,
  sections,
  themeId,
  headerImage = null,
}: FormPreviewPanelProps) {
  const theme = resolveFormTheme(themeId);

  return (
    <div className="mx-auto w-full max-w-[48rem] space-y-4">
      <p className="text-center text-sm text-ink-muted">{ui.previewHint}</p>
      <div
        className="overflow-hidden rounded-lg border border-border bg-bg-elevated"
        style={formThemeStyle(themeId)}
      >
        <FormHeaderBanner
          headerImage={headerImage}
          themeHeaderColor={theme.header}
          title={title}
        />
        <div className="p-6 sm:p-8">
          <FormFillPreview
            title={title}
            description={description}
            questions={questions}
            sections={sections}
          />
        </div>
      </div>
    </div>
  );
}
