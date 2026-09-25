export default function EmptyState({
  onReset,
  title = "还没有分析结果",
  subtitle = "先上传一张正脸照片，获取你的专属护肤方案",
}: {
  onReset: () => void;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cream-deep text-3xl">
        ✨
      </div>
      <h2 className="text-base font-semibold text-skin">{title}</h2>
      <p className="mt-1 max-w-[240px] text-xs text-skin-light">{subtitle}</p>
      <button
        onClick={onReset}
        className="mt-6 min-h-[52px] rounded-2xl bg-blush-deep px-8 font-semibold text-white shadow-lg shadow-blush/30"
      >
        开始建立肌肤档案
      </button>
    </div>
  );
}
