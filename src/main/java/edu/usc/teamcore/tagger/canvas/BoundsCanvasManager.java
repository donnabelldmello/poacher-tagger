package edu.usc.teamcore.tagger.canvas;

import java.awt.*;
import javax.swing.JFrame;

public class BoundsCanvasManager extends Canvas {
	
	String imgFile = null;
	String bbox = null;
	String bufferedBbox = null;
	
	public void paint(Graphics g) {

		Toolkit t = Toolkit.getDefaultToolkit();
		Image img = t.getImage(imgFile);
		g.drawImage(img, 0, 0, this);

		//buffered bounding box
		g.setColor(new Color(133, 133, 13, 90)); //green transparent
		g.fillRect(intAtIndex(bufferedBbox, 0), intAtIndex(bufferedBbox, 1), intAtIndex(bufferedBbox, 2), intAtIndex(bufferedBbox, 3));
		
		//bounding box
		g.setColor(new Color(52, 73, 94, 150)); //blue transparent
		g.fillRect(intAtIndex(bbox, 0), intAtIndex(bbox, 1), intAtIndex(bbox, 2), intAtIndex(bbox, 3));
		
	}

	public static void drawImage(String imgFile, String bbox, String bufferedBbox) {
//		BoundsCanvasManager m = new BoundsCanvasManager(imgFile, bbox, bufferedBbox);
//		JFrame f = new JFrame();
//		f.add(m);
//		f.setSize(700, 600);
//		f.setVisible(true);
		
		System.out.println("\nimg: " + imgFile);
		System.out.println("bbox: " + bbox);
		System.out.println("Buffbbox: " + bufferedBbox);
	}
	
	public static void main_(String[] args) {
		// PREVIOUS
		String source = "/Users/donna/Documents/workspace/tagger/src/main/resources/static/input/0000000009_0000000000/0000000009_0000000000_0000000000.jpg";
		String inputBBox = "206,93,6,13";
		String bufferedBbox = "195,82,28,35";
		BoundsCanvasManager m = new BoundsCanvasManager(source, inputBBox, bufferedBbox);
		JFrame sourcef = new JFrame("Previous frame");
		sourcef.add(m);
		sourcef.setSize(700, 600);
		sourcef.setVisible(true);
		
		// CURRENT		
		String kernel = "/Users/donna/Documents/workspace/tagger/src/main/resources/static/input/0000000009_0000000000/0000000009_0000000000_0000000001.jpg";
		String outputBBox = "204,100,6,13";
		BoundsCanvasManager m2 = new BoundsCanvasManager(kernel, outputBBox, bufferedBbox);

		JFrame kernelf = new JFrame("Current frame");
		kernelf.add(m2);
		kernelf.setSize(700, 600);
		kernelf.setVisible(true);

	}

	public BoundsCanvasManager(String imgFile, String bbox, String bufferedBbox) {
		super();
		this.imgFile = imgFile;
		this.bbox = bbox;
		this.bufferedBbox = bufferedBbox;
	}

	public int intAtIndex(String str, int index){
		return Integer.parseInt(str.split(",")[index]);
	}
	
}

