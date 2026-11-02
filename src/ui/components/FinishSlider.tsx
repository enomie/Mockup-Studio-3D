import { NORMALIZED_DECIMALS, NORMALIZED_STEP } from '@/units/normalized';
import { PAPER_GLOSS_GLOSSY, PAPER_GLOSS_MATT } from '@/scene/paper-gloss';
import { RangeSlider } from '@/ui/components/RangeSlider';

interface FinishSliderProps {
  label?: string;
  value: number;
  onChange: (gloss: number) => void;
}

/** Paper finish: 0 = matt, 1 = glossy. */
export function FinishSlider({
  label = 'Finish (Matt ↔ Glossy)',
  value,
  onChange,
}: FinishSliderProps) {
  return (
    <RangeSlider
      label={label}
      min={PAPER_GLOSS_MATT}
      max={PAPER_GLOSS_GLOSSY}
      step={NORMALIZED_STEP}
      value={value}
      valueInputLabel="Gloss"
      valueInputDecimals={NORMALIZED_DECIMALS}
      onChange={onChange}
    />
  );
}
