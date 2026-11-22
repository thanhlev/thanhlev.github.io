# post_thumbnail_generator.rb - for every doc with `picture:`, write a 200 px wide copy under
# assets/images/thumbnail/<same sub-path>, matching the image_thumbnail filter (which swaps
# "/assets/images/" for "/assets/images/thumbnail/"). Local builds only: GitHub Pages runs in
# safe mode and skips _plugins, so the live site shows the full picture.
# 2026-11-22: keep the picture's sub-folder (assets/images/boards/<slug>/x.png). Before, it used
# File.basename + "assets/images", so any picture in a sub-folder broke the build
# ("No such file assets/images/bpim3_fel_path.png") once the board hub pages were added.
require 'mini_magick'

module Jekyll

  class PostThumbnailImage < StaticFile
    def initialize(site, base, dir, name)
      @site = site
      @base = base
      @dir = dir
      # dir = "assets/images/<sub>" -> thumbnail lands in "assets/images/thumbnail/<sub>"
      @dest_dir = dir.sub(%r{\Aassets/images}, "assets/images/thumbnail")
      @name = name
      @@mtimes = {}
    end

    def destination(dest)
      File.join(dest, @dest_dir, @name)
    end

    def write(dest)
      dest_path = destination(dest)

      return false if File.exist?(dest_path) and !modified?
      @@mtimes[path] = mtime

      FileUtils.mkdir_p(File.dirname(dest_path))
      image = MiniMagick::Image.open(path)
      image.resize "200"
      image.write(dest_path)

      true
    end
  end

  class PostThumbnailGenerator < Generator
    def generate(site)
      # Loop through all site collections.
      site.collections.each do |name, collection|
        collection.docs.each do |doc|
          if doc.data.has_key?("picture")
            pic = doc.data["picture"].to_s.sub(%r{\A/}, "")
            site.static_files << PostThumbnailImage.new(site, site.source, File.dirname(pic), File.basename(pic))
          end
        end
      end
    end
  end

end
