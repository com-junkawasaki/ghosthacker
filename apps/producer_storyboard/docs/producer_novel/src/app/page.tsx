/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/landing-page
 * 
 * Landing page - redirects to projects or shows project list
 */
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/projects/default/editor');
}

