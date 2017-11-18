package edu.usc.teamcore.tagger.service;

import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.util.ArrayList;
import java.util.List;

import javax.imageio.ImageIO;
import javax.swing.ImageIcon;
import javax.swing.JFrame;
import javax.swing.JLabel;

import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.MatOfByte;
import org.opencv.highgui.Highgui;
import org.opencv.imgproc.Imgproc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import edu.usc.teamcore.tagger.config.TaggingConfig;
import lombok.Data;

@Data
@Component
public class BoundingBoxesManager {
	
//	static {
//		System.setProperty("java.awt.headless", "false");
//	}
	
	@Autowired
	private TaggingConfig taggingConf;
	
	@Autowired
	private ConnectedComponentManager connectedComponentMgr;
	
	public String getTranslatedBoxVal(String prevFile, String currFile, String boundsStr, int bufferSize)
			throws MalformedURLException, IOException {

		String positionStr = boundsStr;
		if(!largeBoundingBox(boundsStr)) {
			System.out.println("Correlating \nsource: " + prevFile + "\nkernel: " + currFile);
			
			// Get bounding box dimensions with buffer width & height 
			BufferedImage prevImage = ImageIO.read(new File(prevFile));
			String bufferedBoundStr = getBufferedBoundingBox(boundsStr, prevImage.getWidth(), prevImage.getHeight(), bufferSize);
			
			List<Integer> position = getBoxPositionForImg(prevFile, currFile, bufferedBoundStr);
			convertPositionsToActual(boundsStr, bufferedBoundStr, position);
			
			if(position != null) {
				positionStr = position.toString();
			}
		}
		return positionStr;
	}

	private boolean largeBoundingBox(String boundsStr) {
		int w = Integer.parseInt(Long.toString(Math.round(Double.parseDouble(boundsStr.split(",")[2]))));
		int h = Integer.parseInt(Long.toString(Math.round(Double.parseDouble(boundsStr.split(",")[3]))));
		
		if(w > taggingConf.getBoxAreaMaxSize() || h > taggingConf.getBoxAreaMaxSize()) {
			return true;
		}
		return false;
	}

	private String getBufferedBoundingBox(String boundsStr, int width, int height, int bufferSize) {
		int x = Integer.parseInt(Long.toString(Math.round(Double.parseDouble(boundsStr.split(",")[0]))));
		int y = Integer.parseInt(Long.toString(Math.round(Double.parseDouble(boundsStr.split(",")[1]))));
		int w = Integer.parseInt(Long.toString(Math.round(Double.parseDouble(boundsStr.split(",")[2]))));
		int h = Integer.parseInt(Long.toString(Math.round(Double.parseDouble(boundsStr.split(",")[3]))));
		
		int  x1 = x, y1 = y, x2 = x + w, y2 = y + h;
		x1 = Math.max(x1 - bufferSize, 0);
		y1 = Math.max(y1 - bufferSize, 0);
		x2 = Math.min(x2 + bufferSize, width-1);
		y2 = Math.min(y2 + bufferSize, height-1);

		int wBuff = x2 - x1;
		int hBuff = y2 - y1;
		
		return x1 + "," + y1 + "," + wBuff + "," + hBuff;
	}
	
	public List<Integer> getBoxPositionForImg(String prevFile, String currFile, String bufferedBoundStr) {
		System.loadLibrary( Core.NATIVE_LIBRARY_NAME );
		
	    Mat source = Highgui.imread(prevFile, Highgui.CV_LOAD_IMAGE_GRAYSCALE);
	    Mat kernel = Highgui.imread(currFile, Highgui.CV_LOAD_IMAGE_GRAYSCALE);

	    System.out.println("getBoxPositionForImg: bufferedBoundStr->" + bufferedBoundStr);
	    
	    int x = Integer.parseInt(bufferedBoundStr.split(",")[0]);
	    int y = Integer.parseInt(bufferedBoundStr.split(",")[1]);
	    int w = Integer.parseInt(bufferedBoundStr.split(",")[2]);
	    int h = Integer.parseInt(bufferedBoundStr.split(",")[3]);

	    System.out.println("getBoxPositionForImg: source->" + source.rows() + "x" + source.cols());
	    System.out.println("getBoxPositionForImg: kernel->" + kernel.rows() + "x" + kernel.cols());
	    System.out.println("getBoxPositionForImg: cropedImage->" + y + ","+ (y+h) + "," + x + "," + (x+w));
	    
	    Mat cropedSource = source.submat(y, y+h, x, x+w);
	    Mat cropedKernel = kernel.submat(y, y+h, x, x+w);
	    
	    Mat convertedSource = new Mat();
		cropedSource.convertTo(convertedSource, CvType.CV_8U);
		Mat convertedKernel = new Mat();
		cropedKernel.convertTo(convertedKernel, CvType.CV_8U);
		
//		MinMaxLocResult result = Core.minMaxLoc(convertedKernel);
//	    System.out.println("location: " + result.maxLoc);
//	    System.out.println("min-max: " + result.minVal + " <  " + result.maxVal);
	    
        Mat destination = new Mat(convertedSource.rows(), convertedSource.cols(), CvType.CV_64F);
        
        /*
         *  Plan A: Filter 2D approach
         *  Use correlation from OpenCV to find bounding box
         */
        /*
        Imgproc.filter2D(convertedKernel, destination, CvType.CV_64F, convertedSource, new Point(-1,-1), 0, Imgproc.BORDER_CONSTANT);
	    MinMaxLocResult result = Core.minMaxLoc(destination);
	    System.out.println("location: " + result.maxLoc);
	    System.out.println("min-max: " + result.minVal + " <  " + result.maxVal);
        List<Integer> position = new ArrayList<Integer>();
        position.add(Integer.parseInt(Long.toString(Math.round(result.maxLoc.x)))); //A. Filter 2D approach
        position.add(Integer.parseInt(Long.toString(Math.round(result.maxLoc.y)))); //A. Filter 2D approach
	    */
        
        /*
         *  Plan B: Brightest spot in next frame (local search)
         */
        /* getBrightPixels(destination); */
        
        /*
         *  Plan C: Threshold - Opening - CCA 
         *  search the neighborhood for the bright region using the threshold, opening, and CCA. 
         *  If there are no connected components (> 1 white pixel touching) found during CCA, 
         *  we can just place the bounding box in the same place as the previous frame.
         */
        Mat thresholdedImg = new Mat(convertedSource.rows(), convertedSource.cols(), CvType.CV_8U);
	    double threshhold = Imgproc.threshold(convertedKernel, thresholdedImg, taggingConf.getBoxPixelThreshold(), 255, Imgproc.THRESH_BINARY);
//	    showImageFromMat(thresholdedImg.clone());
	    
	    //Mat newKernel = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, new Size(new Point(3,3)));
	    //Imgproc.morphologyEx(thresholdedImg, destination, Imgproc.MORPH_OPEN, newKernel);

//	    System.out.println("Img:");
//	    printImg(thresholdedImg);
	    int[][] destImgArr = convertMatToArray(thresholdedImg);
//	    showImageFromArray(destImgArr);
	    List<Integer> position = connectedComponentMgr.findConnectedComponent(destImgArr);

	    return position; 
	}
	
	private void printImg(Mat img) {
		System.out.println(img.rows() + "x" + img.cols());
		for(int i= 0; i< img.rows(); i++) {
			System.out.println("");
			for(int j = 0; j < img.cols(); j++) {
				System.out.print(img.get(i, j)[0]);
			}
		}
	}
	
	private List<String> getBrightPixels(Mat img) {
		List<String> points = new ArrayList<String>(); 
		for(int i= 0; i< img.rows(); i++) {
			for(int j = 0; j < img.cols(); j++) {
				double[] data = img.get(i, j);
				if(data[0] > 0.0) {
					points.add(i + "," +j);
				}
			}
		}
		return points;
	}

	private void convertPositionsToActual(String boundsStr, String bufferedBoundStr, List<Integer> position) {
		if(position != null) {
			System.out.println("input box:\t" + boundsStr);
			System.out.println("buffered box:\t" + bufferedBoundStr);
			System.out.println("position in buff bx:\t" + position);
			
			int x = position.remove(0);
			int bbX = Integer.parseInt(boundsStr.split(",")[2]);
			int buffX = Integer.parseInt(bufferedBoundStr.split(",")[0]);
			x = buffX + x - (bbX/2);
			position.add(0, x);
			
			int y = position.remove(1);
			int bbY = Integer.parseInt(boundsStr.split(",")[3]);
			int buffY = Integer.parseInt(bufferedBoundStr.split(",")[1]);
			y = buffY + y - (bbY/2);
			position.add(1, y);
			
			position.add(bbX);
			position.add(bbY);
			System.out.println("output box:\t" + position + "\n");
		}
	}
	
	private int[][] convertMatToArray(Mat img) {
		int[][] points = new int[img.cols()][img.rows()]; 
		for(int i= 0; i< img.cols(); i++) {
			for(int j = 0; j < img.rows(); j++) {
				points[i][j] = Integer.parseInt(Long.toString(Math.round(img.get(j, i)[0])));
			}
		}
		return points;
	}
	
	public static void showImageFromMat(Mat img) {
//	    Imgproc.resize(img, img, new Size(640, 480));
	    MatOfByte matOfByte = new MatOfByte();
	    Highgui.imencode(".jpg", img, matOfByte);
	    byte[] byteArray = matOfByte.toArray();
	    BufferedImage bufImage = null;
	    try {
	        InputStream in = new ByteArrayInputStream(byteArray);
	        bufImage = ImageIO.read(in);
	        JFrame frame = new JFrame("Thresholded Image");
	        frame.getContentPane().add(new JLabel(new ImageIcon(bufImage)));
	        frame.pack();
	        frame.setVisible(true);
	    } catch (Exception e) {
	        e.printStackTrace();
	    }
	}
	
	public static Image showImageFromArray(int[][] image) {
		// Initialize BufferedImage, assuming Color[][] is already properly populated.
		BufferedImage bufferedImage = new BufferedImage(image.length, image[0].length,
		        BufferedImage.TYPE_INT_RGB);
		// Set each pixel of the BufferedImage to the color from the Color[][].
		for (int x = 0; x < image.length; x++) {
		    for (int y = 0; y < image[x].length; y++) {
		        bufferedImage.setRGB(x, y, image[x][y]);
		    }
		}
		try {
	        JFrame frame = new JFrame("Thresholded Image Array");
	        frame.getContentPane().add(new JLabel(new ImageIcon(bufferedImage)));
	        frame.pack();
	        frame.setVisible(true);
	    } catch (Exception e) {
	        e.printStackTrace();
	    }
		return bufferedImage;
    }
	
	public static void main1(String[] args) {
		
		BoundingBoxesManager boxManager = new BoundingBoxesManager();
		String prevFile = "/Users/donna/Documents/workspace/tagger/src/main/resources/static/input/img/src.jpeg";
		String currFile = "/Users/donna/Documents/workspace/tagger/src/main/resources/static/input/img/kernel.jpeg";
		try {
			BufferedImage prevImage = ImageIO.read(new File(prevFile));
			String boundsStr = "0,0," + prevImage.getWidth() +","+ prevImage.getHeight();
			System.out.println(boxManager.getTranslatedBoxVal(prevFile, currFile, boundsStr, 15));
		} catch (MalformedURLException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
}
