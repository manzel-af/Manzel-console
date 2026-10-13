import { SupportFrame } from './frame';

/** The desk: the list of conversations beside the one that is open. */
export default function SupportLayout({ children }: LayoutProps<'/[lang]/support'>) {
  return <SupportFrame>{children}</SupportFrame>;
}
