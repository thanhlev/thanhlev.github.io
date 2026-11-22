# unpublished_filter.rb: drop collection docs whose front matter says `publish: false`.
#
# Why (2026-11-22 audit): the front matter template in CLAUDE.md uses our own key `publish`,
# not Jekyll's built-in `published`. Jekyll ignores `publish`, so the three drafts in
# _linux_networking (pppoe_server, rpi_router, rpi_router_wwan) were still rendered to _site
# and listed in sitemap.xml; only the index.md table hid some of them.
#
# Rule: `publish: false` -> the doc is not written and not in the sitemap.
#       `publish` missing or anything else -> published (same as index.md's `publish != false`).
# Preview drafts locally with `bundle exec jekyll serve --unpublished` (sets site.unpublished,
# the same switch Jekyll uses for `published: false`).
#
# Priority :highest so it runs before post_thumbnail_generator.rb and jekyll-sitemap
# (a :lowest generator), which both walk collection.docs.
module Jekyll
  class UnpublishedFilter < Generator
    priority :highest

    def generate(site)
      return if site.unpublished
      site.collections.each_value do |collection|
        dropped = collection.docs.select { |doc| doc.data['publish'] == false }
        next if dropped.empty?
        collection.docs.reject! { |doc| doc.data['publish'] == false }
        dropped.each do |doc|
          Jekyll.logger.info 'Unpublished:', doc.relative_path
        end
      end
    end
  end
end
